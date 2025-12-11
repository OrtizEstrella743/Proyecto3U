# Usa una imagen base pequeña para Node.js
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de configuración
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el código fuente (app.js, tracing.js)
COPY . .

# Expone el puerto 3000
EXPOSE 3000

# Comando para correr la app
CMD [ "npm", "start" ]