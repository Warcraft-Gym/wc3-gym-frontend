// A blank field means no value is stored, and the backend takes null for that
const normalise = (value) => (value === '' || value == null ? null : String(value));

// The keys whose value moved since the load, so a failed load has nothing to send
export const changedSettings = (loaded, current) => {
    const changed = {};
    if (!loaded) return changed;
    for (const key of Object.keys(current)) {
        const value = normalise(current[key]);
        if (value !== normalise(loaded[key])) changed[key] = value;
    }
    return changed;
};
