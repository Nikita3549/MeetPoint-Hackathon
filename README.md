**Swagger**

Можно получить по ссылке:

https://hack-umms-team-3-backend-virtual-machine-2311dc.vm.prodcontest.com/api/docs

**Проверка запросов (HTTP Client):**

Открыть только [`http/jury.http`](http/jury.http) — 36 шагов, каждый endpoint один раз.

**Предусловия запуска:**
- Предустановленный docker
- Созданный .env файл по примеру ниже

**Создать .env файл в корне проекта и вставить:**
```
DATABASE_URL="postgresql://postgres:byHN2h8yIrvvUDu1qN0AQwuRC5LpQE6S@database:5432/prod-final?schema=public"
DATABASE_PASSWORD=byHN2h8yIrvvUDu1qN0AQwuRC5LpQE6S
DATABASE_USER=postgres
DATABASE_DBNAME=prod-final
DATABASE_PORT=5432

JWT_SECRET=43AzVmpkmkNnCvBldbKGyV5ZgPAqqGQD
JWT_EXPIRES_IN=7d

API_PORT=3000
APP_PUBLIC_URL=https://hack-umms-team-3-backend-virtual-machine-2311dc.vm.prodcontest.com

CLOUDINARY_NAME=dj3xwdlec
CLOUDINARY_KEY=699617586252732
CLOUDINARY_SECRET=qODZYDCQfnZsEKIUXVI9CQXk8Cg
```

**Запустить тесты и увидеть покрытие в логах:**
```docker compose --profile test up```
