FROM fedora:40

RUN dnf install -y \
    gcc gcc-c++ make \
    openssl-devel glib2-devel gtk3-devel \
    webkit2gtk4.1-devel libsoup3-devel \
    && dnf clean all

RUN curl https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app
