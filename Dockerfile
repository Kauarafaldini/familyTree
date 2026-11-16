# ============================================================================
# DOCKERFILE - Deploy do FamilyTree no Render (PHP 8.3 + Apache + MongoDB)
# ============================================================================

FROM php:8.3-apache

# Instala dependências do sistema e compila a extensão oficial pecl/mongodb
RUN apt-get update && apt-get install -y \
    libssl-dev \
    pkg-config \
    unzip \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Copia todo o código-fonte para a raiz do Apache
WORKDIR /var/www/html
COPY . /var/www/html/

# Permissões e executável do script de entrada
RUN chown -R www-data:www-data /var/www/html \
    && chmod +x /var/www/html/entrypoint.sh

# Porta de rede
EXPOSE 80

# Inicia o Apache adaptando a porta dinâmica ($PORT) do Render
ENTRYPOINT ["/var/www/html/entrypoint.sh"]
