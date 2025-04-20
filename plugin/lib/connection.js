"use strict";

module.exports = function(options, app, publishDelta) {
  let connModule;
  const connectionType = options.connection && options.connection.connectionType;
  app.debug(`[CONNECTION] connectionType is: ${connectionType}`);
  
  if (connectionType === "websocket") {
    app.debug("[CONNECTION] Loading websocket connection module");
    connModule = require('./websocket/ws')(app, publishDelta);
  } else if (connectionType === "serial") {
    app.debug("[CONNECTION] Loading serial connection module");
    connModule = require('./serial/serial')(app, publishDelta);
  } else {
    throw new Error("Unsupported connection type: " + connectionType);
  }
  
  return connModule;
};