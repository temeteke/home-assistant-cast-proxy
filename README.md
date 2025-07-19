# Home Assistant Cast Proxy

*This project was created with the help of Gemini CLI.*

A simple proxy server to cast media via Home Assistant, avoiding CORS issues when calling the API from a web browser.

This server exposes a simple API that can be consumed by a front-end application. It handles the communication with the Home Assistant API, including authentication and service calls.

## Architectural Note: CORS and Reverse Proxies

This server is designed to be deployed behind a reverse proxy (like Nginx, Apache, or Caddy). The reverse proxy should handle requests for both the front-end application and this back-end server under the same domain.

For example, you can configure the reverse proxy to:
- Serve your front-end application for requests to `/`.
- Forward requests for `/cast-proxy/...` to this proxy server.

This setup makes it appear to the browser that both the front-end and back-end are on the same origin, which eliminates Cross-Origin Resource Sharing (CORS) errors. For this reason, this application does not include the `cors` library.

## Features

- ✅ Fetches a list of available `media_player` entities from Home Assistant.
- ✅ Turns on the target device before attempting to cast.
- ✅ Casts a specified video URL to the target device.
- ✅ Containerized with Docker for easy deployment.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Docker](https://www.com/docker) (Optional, for containerized deployment)
- A running [Home Assistant](https://www.home-assistant.io/) instance.
- A Long-Lived Access Token for Home Assistant.

## Setup

1.  **Clone the repository (or download the files):**
    ```bash
    # git clone <repository-url>
    # cd home-assistant-cast-proxy
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

This application is configured using environment variables.

- `HOME_ASSISTANT_URL`: The full URL to your Home Assistant instance (e.g., `http://<your-home-assistant-ip>:8123`).
- `HOME_ASSISTANT_TOKEN`: Your Home Assistant Long-Lived Access Token.
- `PORT`: (Optional) The port on which the proxy server will run. Defaults to `3000`.

## Running the Server

You can run the server either directly with Node.js or using Docker.

### Locally with Node.js

You must set the required environment variables in your shell before starting the server.

```bash
export HOME_ASSISTANT_URL="http://<your-home-assistant-ip>:8123"
export HOME_ASSISTANT_TOKEN="<your-long-lived-access-token>"
export PORT=3000

node index.js
```
The server will start on the port you specified (or 3000 by default).

### Using Docker

This is the recommended method for deployment.

1.  **Build the Docker image:**
    ```bash
    docker build -t home-assistant-cast-proxy .

2.  **Run the Docker container:**
    This command runs the container and configures it by passing the environment variables directly.
    ```bash
    docker run -d -p 3000:3000 --name home-assistant-cast-proxy \
      -e HOME_ASSISTANT_URL="http://<your-home-assistant-ip>:8123" \
      -e HOME_ASSISTANT_TOKEN="<your-long-lived-access-token>" \
      -e PORT=3000 \
      home-assistant-cast-proxy
    ```
    The server will be accessible at `http://localhost:3000`.

## API

### Interactive API Documentation (Swagger UI)

Once the server is running, you can access the interactive API documentation and try out the endpoints in your browser:

`http://localhost:3000/api-docs` (or `http://<your-proxy-server>/api-docs` if behind a reverse proxy)

### Endpoints

- `GET /cast-proxy/media-players`: Get a list of available media players.
- `POST /cast-proxy/cast`: Cast a video to a specified player.
