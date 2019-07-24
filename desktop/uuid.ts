function getUUID() {
  const os = require('os');
  return `pandalab-agent-desktop-${os.userInfo().uid}-${os.userInfo().username}`;
}
export { getUUID };
