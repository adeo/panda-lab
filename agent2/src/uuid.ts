const os = require('os');
exports.UUID = `pandalab-agent-desktop-${os.userInfo().uid}-${os.userInfo().username}`;
