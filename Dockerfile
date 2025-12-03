# Estágio 1: Build
FROM node:20-alpine as build

WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json ./
RUN npm install

# Copia todo o projeto
COPY . .

# Copia as variáveis de ambiente (Importante para o Firebase funcionar)
COPY .env .env

# Gera a pasta 'dist'
RUN npm run build

# Estágio 2: Servidor Produção (Nginx)
FROM nginx:alpine

# Copia nossa configuração do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos gerados no estágio 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
