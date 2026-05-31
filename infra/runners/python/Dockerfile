FROM python:3.12-slim

WORKDIR /runner
RUN useradd --create-home --shell /usr/sbin/nologin runner
COPY runner.py /runner/runner.py
USER runner

CMD ["python", "/runner/runner.py"]
