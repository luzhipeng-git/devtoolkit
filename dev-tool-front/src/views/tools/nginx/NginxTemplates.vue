<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const templates = [
  { name: '反向代理', desc: '基础反向代理配置',
    config: `server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}` },
  { name: 'HTTPS 服务器', desc: 'SSL/TLS 配置模板',
    config: `server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}` },
  { name: '静态文件服务', desc: '前后端分离静态资源服务',
    config: `server {
    listen 80;
    server_name static.example.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
}` },
  { name: '负载均衡', desc: '多后端 upstream 配置',
    config: `upstream backend {
    ip_hash;
    server 192.168.1.10:8080 weight=3;
    server 192.168.1.11:8080 weight=2;
    server 192.168.1.12:8080 backup;
}

server {
    listen 80;
    server_name lb.example.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}` },
  { name: 'API 网关', desc: '微服务 API 路由转发',
    config: `server {
    listen 80;
    server_name api.example.com;

    location /auth/ {
        proxy_pass http://auth-service:8080/;
        proxy_set_header Host $host;
    }

    location /users/ {
        proxy_pass http://user-service:8081/;
        proxy_set_header Host $host;
    }

    location /orders/ {
        proxy_pass http://order-service:8082/;
        proxy_set_header Host $host;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}` },
]

const selectedIndex = ref(0)
const output = ref(templates[0].config)

function selectTemplate(idx: number) {
  selectedIndex.value = idx
  output.value = templates[idx].config
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header"><h3 class="tool-title">Nginx 配置模板</h3></div>
    <div class="template-list">
      <div v-for="(t, idx) in templates" :key="idx" class="template-card" :class="{ active: selectedIndex === idx }" @click="selectTemplate(idx)">
        <div class="template-name">{{ t.name }}</div>
        <div class="template-desc">{{ t.desc }}</div>
      </div>
    </div>
    <div style="margin-top:16px;">
      <div class="result-header">
        <span class="form-label">{{ templates[selectedIndex].name }} 配置</span>
        <CopyButton :text="output" />
      </div>
      <textarea :value="output" class="form-textarea" readonly rows="20" />
    </div>
  </ToolContainer>
</template>

<style scoped>

.template-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.template-card {
  padding: 12px; border: 1px solid var(--border-card); border-radius: 8px;
  cursor: pointer; transition: all 0.2s;
}
.template-card:hover { border-color: var(--primary); }
.template-card.active { border-color: var(--primary); background: rgba(59,130,246,0.06); }
.template-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.template-desc { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }

</style>
