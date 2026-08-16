FROM docker.io/cloudflare/sandbox:0.12.7-python

RUN pip3 install --no-cache-dir pypdf==6.16.1 \
  && mkdir -p /opt/cobalt \
  && python3 -c "from pypdf import PdfWriter; writer = PdfWriter(); writer.add_blank_page(width=72, height=72); writer.add_metadata({'/Title': 'Cobalt Sandbox Smoke'}); writer.write('/opt/cobalt/sample.pdf')"

EXPOSE 8080
