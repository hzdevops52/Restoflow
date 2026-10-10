# RestoFlow — Restaurant Order Management System

RestoFlow is a web-based restaurant management application for handling menu items, categories, tables, orders, kitchen workflows, and cashier operations.

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose
- **Image Uploads:** Multer
- **Web Server:** Nginx
- **Containerization:** Docker, Docker Compose
- **CI/CD:** GitHub Actions

## Features

- Menu and category management
- Restaurant table management
- Order creation and status tracking
- Kitchen and cashier workflows
- Product image uploads with persistent storage
- Containerized deployment
- Automated frontend and backend validation

## Architecture

The React frontend is served by Nginx. Nginx proxies API requests to the Express backend, which stores application data in MongoDB.

Docker Compose manages the frontend, backend, and database services.

## Run with Docker Compose

Prerequisites: Docker Engine and the Docker Compose plugin.

```bash
docker compose up -d --build
```

Open the application at **http://localhost:8081**.

Check service status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

Stop the services:

```bash
docker compose down
```

MongoDB data is stored in a Docker-managed volume. Normal shutdown preserves the volume; avoid `docker compose down -v` unless you intend to delete it.

## Local Development

Configure the backend environment:

```bash
cp backend/.env.example backend/.env
```

Install dependencies using `npm ci` in both the `backend` and `frontend` directories.

Start the backend with `npm start` from `backend/`, then start the frontend with `npm run dev` from `frontend/`.

Ensure MongoDB is running and the backend environment is configured before starting the application.

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check |
| `/api/categories` | Category operations |
| `/api/products` | Product and image operations |
| `/api/tables` | Table operations |
| `/api/orders` | Order operations |

## Continuous Integration

GitHub Actions runs the workflow defined in `.github/workflows/ci.yml` on pushes, pull requests, and manual dispatches.

The pipeline:
- Installs frontend dependencies and runs ESLint.
- Builds the production frontend.
- Installs backend dependencies.
- Validates backend JavaScript syntax.

## Security

- Never commit real `.env` files or credentials.
- Keep database access restricted and use least-privilege credentials.
- Review dependency security advisories before upgrading packages.
- Back up persistent data before migrations or destructive operations.

## License

See the repository's `LICENSE` file for licensing terms.
