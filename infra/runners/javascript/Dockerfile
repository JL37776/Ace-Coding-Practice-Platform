FROM node:22-slim

WORKDIR /runner
RUN useradd --create-home --shell /usr/sbin/nologin runner
COPY runner.mjs /runner/runner.mjs
USER runner

CMD ["node", "/runner/runner.mjs"]
