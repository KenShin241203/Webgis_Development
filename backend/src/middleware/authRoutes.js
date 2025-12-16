const authorize = ({ roles = [], permissions = [] } = {}) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (roles.length > 0) {
            if (!user.role || !roles.includes(user.role)) {
                return res.status(403).json({ message: 'Forbidden: insufficient role' });
            }
        }

        if (permissions.length > 0) {
            const userPerms = new Set(user.permissions || []);
            const missing = permissions.filter(p => !userPerms.has(p));
            if (missing.length > 0) {
                return res.status(403).json({ message: 'Forbidden: missing permissions', missing });
            }
        }

        next();
    }
}

module.exports = authorize