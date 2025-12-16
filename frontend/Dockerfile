# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

# Copy app static files
COPY . /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 