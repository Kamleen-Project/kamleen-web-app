## Robot Framework runner with Browser (Playwright) isolated from the Next.js app
## Use Playwright base (Node + browsers), then add Python
FROM mcr.microsoft.com/playwright:v1.46.0-focal

WORKDIR /work

# Install Python and pip, then Robot deps and initialize Browser (needs Node present)
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends \
       python3 python3-pip python3-dev \
       build-essential libatomic1 \
    && rm -rf /var/lib/apt/lists/*

COPY tests/robot/requirements.txt /tmp/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /tmp/requirements.txt \
    && python3 -m Browser.entry init

# Default entry; test files will be mounted at runtime
ENTRYPOINT ["robot"]

