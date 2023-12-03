FROM node:14

# Установка рабочей директории в контейнере
WORKDIR /usr/src/app

# Копирование файлов package.json и package-lock.json (если есть)
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копирование исходного кода приложения в контейнер
COPY . .

# Открытие порта 3000
EXPOSE 3000

# Команда для запуска приложения
CMD [ "node", "./server/server.js" ]
