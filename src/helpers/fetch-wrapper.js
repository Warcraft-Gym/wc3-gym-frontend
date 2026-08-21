import { useAuthStore } from '@/stores';

export const fetchWrapper = {
    get: request('GET'),
    getSecure: request('GET_SECURE'),  // Authenticated GET request
    post: request('POST'),
    postFile: request('FILE_UPLOAD'),
    put: request('PUT'),
    delete: request('DELETE'),
    fileUpload: request('FILE_UPLOAD'),
    getFile: request('GET_FILE'),
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
        let requireAuth = false;

        if (requestMethod === "FILE_UPLOAD") {
            requestMethod = "POST";
            fileUpload = true;
        }
        if (requestMethod === "GET_FILE") {
            requestMethod = "GET";
            receiveBinary = true;
        }
        if (requestMethod === "GET_SECURE") {
            requestMethod = "GET";
            requireAuth = true;  // Force authentication for this GET request
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
        const headers = await authHeader(requestMethod, url, requireAuth);
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

async function authHeader(method, url, requireAuth = false) {
    const authstore = useAuthStore();
    const user = authstore.user;
    const isRestricted = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || requireAuth;
    const isLoggedIn = !!user?.access_token;
    const isApiUrl = url.startsWith(import.meta.env.VITE_BACKEND_URL);
    const isRefreshUrl = url.startsWith(import.meta.env.VITE_BACKEND_URL + "/refresh");
    const isLoginUrl = url.startsWith(import.meta.env.VITE_BACKEND_URL + "/login");

    if (isLoginUrl) {
        return {};
    }
    if (isRefreshUrl) {
        return { Authorization: `Bearer ${user.refresh_token}` };
    } 
    if (isRestricted && isLoggedIn && isApiUrl) {
        if (authstore.isTokenExpired(user.access_token)) {
            if (authstore.isTokenExpired(user.refresh_token)) {
                authstore.logout();
                return {};
            } else {
                await authstore.refresh(user.refresh_token);
            }
        }
        return { Authorization: `Bearer ${authstore.user.access_token}` };
    } 
    return {};
}

async function handleResponse(response, receiveBinary, receivePage = false) {
    if (!response.ok) {
        const { user, logout } = useAuthStore();

        if ([401, 403].includes(response.status) && user) {
            logout(); // Logout on unauthorized access
        }

        // **Properly await the response before rejecting**
        const text = await response.text();
        let error;

        try {
            error = text ? JSON.parse(text) : text;
        } catch (parseError) {
            error = text; // Fallback if parsing fails
        }
        
        return Promise.reject(error);
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
