// Which /profile body a signed-in viewer sees; null until /me has loaded
export function profileState(me) {
    if (!me) return null;
    if (me.role === 'guest') return 'guest';
    return me.user ? 'dashboard' : 'signup'; // a member with no users row signs up first
}
