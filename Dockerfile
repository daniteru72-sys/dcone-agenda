FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
ARG VITE_N8N_WEBHOOK_URL
ARG VITE_OWNER_CHAT_ID
ARG VITE_BUSINESS_NAME
ARG VITE_ONESIGNAL_APP_ID

ENV VITE_N8N_WEBHOOK_URL=$VITE_N8N_WEBHOOK_URL
ENV VITE_OWNER_CHAT_ID=$VITE_OWNER_CHAT_ID
ENV VITE_BUSINESS_NAME=$VITE_BUSINESS_NAME
ENV VITE_ONESIGNAL_APP_ID=$VITE_ONESIGNAL_APP_ID

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
