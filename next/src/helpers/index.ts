// The barrel the shell and 12 views import. The route table is in `@/lib/routes` and the
// theme choice is a hook.
export { backendUrl } from "@/helpers/backend-url.js";
export { fetchWrapper, authHeader, pageQuery, PAGE_LIMIT } from "@/helpers/fetch-wrapper.js";
export { canSeeRole, homePath } from "@/lib/routes";
export { useTheme, setThemeMode } from "@/hooks/theme";
