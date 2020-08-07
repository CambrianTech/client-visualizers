# 1. Build with npm
FROM node:12.10-alpine as build-stage
WORKDIR /app
COPY package*.json /app/
COPY . /app/
RUN npm install
COPY . /app/
#RUN rm -rf /app/public/assets/custom
RUN npm run build

# 2. Copy built files into nginx container
FROM nginx:1.17-alpine
COPY --from=build-stage /app/build/ /usr/share/nginx/html
COPY --from=build-stage /app/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

WORKDIR /opt/server

COPY --from=build-stage /app/build/index.html /opt/server/build/index.html
COPY server/ /opt/server

RUN apk add --update nodejs npm
RUN npm install

# To handle 'not get uid/gid' (see https://stackoverflow.com/q/52196518/4332314)
RUN npm config set unsafe-perm true

RUN npm install -g forever

CMD sh start.sh