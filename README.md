**Предусловия запуска:**
- Предустановленный docker
- Созданный .env файл по примеру ниже

**Создать .env файл в корне проекта и вставить:**
```
DATABASE_URL="postgresql://postgres:byHN2h8yIrvvUDu1qN0AQwuRC5LpQE6S@localhost:5432/prod-hackathon?schema=public"

DATABASE_PASSWORD=byHN2h8yIrvvUDu1qN0AQwuRC5LpQE6S
DATABASE_USER=postgres
DATABASE_DBNAME=prod-hackathon
DATABASE_PORT=5432

API_PORT=3000

APP_PUBLIC_URL=

JWT_SECRET=
JWT_EXPIRES_IN=7d

CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=

GRAFANA_PASSWORD=
```