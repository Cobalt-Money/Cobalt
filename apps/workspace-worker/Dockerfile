FROM docker.io/cloudflare/sandbox:0.12.7-python

USER root

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    bash \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-writer \
    pandoc \
    poppler-utils \
  && pip3 install --no-cache-dir \
    openpyxl==3.1.5 \
    pypdf==6.16.1 \
    python-docx==1.2.0 \
    python-pptx==1.0.2 \
  && groupadd --gid 10001 cobalt \
  && useradd --create-home --gid cobalt --shell /bin/bash --uid 10001 cobalt \
  && mkdir -p /mnt/outputs /mnt/uploads /workspace \
  && chown -R cobalt:cobalt /home/cobalt /mnt/outputs /mnt/uploads /workspace \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -c "import platform; assert platform.python_version().startswith('3.11.'); import pypdf, docx, openpyxl, pptx" \
  && bash --version

USER cobalt
WORKDIR /workspace

EXPOSE 8080
