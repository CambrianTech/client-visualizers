# 1. Build with npm
FROM node:14.7.0-alpine as build-stage
#FROM 312943975091.dkr.ecr.us-east-1.amazonaws.com/client-visualizers:node-14.7.0-alpine as build-stage
WORKDIR /app
COPY package*.json /app/
RUN npm install
COPY . /app/
RUN rm -rf /app/public/assets/custom
RUN rm -rf /app/public/assets/cambrianar-sites
RUN npm run build

# 2. Copy built files into nginx container
FROM nginx:1.17-alpine
#FROM 312943975091.dkr.ecr.us-east-1.amazonaws.com/client-visualizers:nginx-1.17-alpine
RUN mkdir -p /opt/server/sites
COPY --from=build-stage /app/build/config /opt/server/config
COPY --from=build-stage /app/build/ /usr/share/nginx/html
COPY --from=build-stage /app/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

WORKDIR /opt/server

COPY --from=build-stage /app/build/index.html /opt/server/build/index.html
COPY server/ /opt/server

RUN apk add --update nodejs npm
RUN npm install
RUN npm run build

# To handle 'not get uid/gid' (see https://stackoverflow.com/q/52196518/4332314)
RUN npm config set unsafe-perm true

RUN npm install -g forever

CMD sh start.sh