// A Discord session the backend refuses signs in again without a click: Discord skips the consent
// page for an account it knows. The admin token and the dev login have no Discord account to go back
// to, a view-as refusal is a permission, not a dead session, and with no me there is no session to renew.
export const canSignInAgain = ({ user, me, viewAs }) => !!user?.access_token && !user.dev && !!me && !me.superadmin && !viewAs;
