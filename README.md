# DashboardX

Node.js dashboard + Web client + Android WebView bridge

## Stack
- Node.js + ws + grammy
- Webpack client
- Android WebView + JS Bridge

## Description
- A workspace system with widgets that can:
- be freely moved around the workspace
- be resized
- A navigation menu with:
- workspace switching
- hotkey support
- widget categorization

On the backend, I'm developing an
HTTP/WebSocket server in Node.js,
which aggregates data from external APIs, including:
- Binance
- MoneyConvert
- (more integrations planned)

Next steps include:
- Displaying the server console in the client interface
- Client-side logging
- Integrating an audio and video player
- Connecting the Telegram API for bot administration and sending messages
- Integrating mapping APIs for displaying geolocation
- Widgets for managing personal finances

The client will also be integrated into an Android WebView application
with an androidBridge implementation for interaction between the
native part and the server (working with SMS, geolocation, and other system data).
Similar integration is planned for iOS.

The project is being developed as an extensible modular system
with the ability to scale functionality.