#! /usr/bin/env node
const config = require("../../.config/config.json");

let agentBuildTargets = config.agentBuildTargets;
if(!agentBuildTargets){
    agentBuildTargets = ""
}
const agent = 'vue-cli-service electron:build -'+agentBuildTargets; // A string runs a simple command

module.exports = { agent };
