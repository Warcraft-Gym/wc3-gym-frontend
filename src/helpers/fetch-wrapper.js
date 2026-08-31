import { useAuthStore } from '@/stores';

export const fetchWrapper = {
    get: request('GET'),
    getSecure: request('GET_SECURE'),  // GET; a session bearer is attached like any other request
    post: request('POST'),
    postFile: request('FILE_UPLOAD'),
    put: request('PUT'),
    delete: request('DELETE'),
    fileUpload: request('FILE_UPLOAD'),
    postBinary: request('POST_BINARY'),  // POST request that receives binary data
    postPage: request('POST_PAGE'),  // POST that returns { items, total } from X-Total-Count
    getPage: request('GET_PAGE'),  // GET that returns { items, total } from X-Total-Count
    getAll: getAllPages('GET'),  // GET every row of a route, one limit/offset page at a time
    postAll: getAllPages('POST')  // POST every row of a route, one limit/offset page at a time
};

export const PAGE_LIMIT = 500;  // the largest limit the backend accepts

// Build the query string of a paged list request; keys without a value are left out
export function pageQuery({ limit, offset, search, sort, order } = {}) {
    const params = new URLSearchParams();
    const term = typeof search === 'string' ? search.trim() : search;

    for (const [key, value] of Object.entries({ limit, offset, search: term, sort, order })) {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    }

    return params.toString();  // no leading '?'; the caller picks the separator
}

// Read pages until the collected rows reach the X-Total-Count of the route
function getAllPages(method) {
    const readPage = method === 'POST' ? 'postPage' : 'getPage';

    return async (url) => {
        const base = url.endsWith('?') || url.endsWith('&') ? url : `${url}${url.includes('?') ? '&' : '?'}`;
        const items = [];
        let total = 0;

        do {
            const pageUrl = `${base}limit=${PAGE_LIMIT}&offset=${items.length}`;
            const page = await fetchWrapper[readPage](pageUrl);
            const pageItems = page.items || [];
            total = page.total ?? items.length + pageItems.length;
            items.push(...pageItems);
            if (pageItems.length === 0) {
                break;  // stop when the route sends no more rows
            }
        } while (items.length < total);

        return items;
    };
}

function request(method) {
    return async (url, body) => {  // Mark as async
        let requestMethod = method;
        let fileUpload = false;
        let receiveBinary = false;

        if (requestMethod === "FILE_UPLOAD") {
            requestMethod = "POST";
            fileUpload = true;
        }
        if (requestMethod === "GET_SECURE") {
            requestMethod = "GET";
        }
        if (requestMethod === "POST_BINARY") {
            requestMethod = "POST";
            receiveBinary = true;
        }
        let receivePage = false;
        if (requestMethod === "POST_PAGE") {
            requestMethod = "POST";
            receivePage = true;
        }
        if (requestMethod === "GET_PAGE") {
            requestMethod = "GET";
            receivePage = true;
        }

        // **Wait for headers to be resolved before passing them**
        const headers = await authHeader(requestMethod, url);
        const requestOptions = { method: requestMethod, headers };

        if (body) {
            if (fileUpload) {
                requestOptions.body = body;
            } else {
                requestOptions.headers['Content-Type'] = 'application/json';
                requestOptions.body = JSON.stringify(body);
            }
        }

        // **Await the fetch response**
        const response = await fetch(url, requestOptions);
        return handleResponse(response, receiveBinary, receivePage); // Awaiting inside handleResponse
    };
}

// exported so the raw FormData requests can send the same bearer
export async function authHeader(method, url) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!url.startsWith(backendUrl) || url.startsWith(`${backendUrl}/login`)) {
        return {};
    }

    const store = useAuthStore();
    const token = await store.token();
    if (!token) return {};
    const headers = { Authorization: `Bearer ${token}` };
    if (store.viewAs) {  // the backend lowers an admin's role for this request
        headers['X-View-As'] = store.viewAs.role;
        if (store.viewAs.teamId) headers['X-View-Team'] = String(store.viewAs.teamId);
    }
    return headers;
}

// Turn a failed response into an Error, keeping the body fields callers read for a code
function responseError(body, text, status) {
    const message = body?.message || body?.error || body?.msg || text.trim() || `HTTP ${status}`;
    return Object.assign(new Error(message), body, { message, status, body });
}

async function handleResponse(response, receiveBinary, receivePage = false) {
    if (!response.ok) {
        const { me, viewAs, logout } = useAuthStore();

        // a refusal met while viewing as a lower role is the point, not a dead session
        if ([401, 403].includes(response.status) && me && !viewAs) {
            logout(); // Logout on unauthorized access
        }

        // **Properly await the response before rejecting**
        const text = await response.text();
        let body = null;

        try {
            const parsed = text ? JSON.parse(text) : null;
            body = parsed && typeof parsed === 'object' ? parsed : null;
        } catch (parseError) {
            body = null; // the raw text carries the message
        }

        return Promise.reject(responseError(body, text, response.status));
    }

    if (receiveBinary) {
        return response;
    }

    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : text;
    } catch (parseError) {
        data = text;
    }

    if (receivePage) {
        const total = response.headers.get('X-Total-Count');
        return { items: data, total: total === null ? null : Number(total) };
    }
    return data;
}
