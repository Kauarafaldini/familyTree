# ============================================================================
# DOCKERFILE - Deploy do FamilyTree no Render (PHP 8.3 + Apache + MongoDB)
# Otimizado para o plano gratuito (512 MB de RAM)
# ============================================================================

FROM php:8.3-apache

# Extensão oficial pecl/mongodb + OPcache; remove ferramentas de build depois
RUN apt-get update && apt-get install -y --no-install-recommends \
        libssl-dev \
        pkg-config \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && docker-php-ext-install opcache \
    && a2enmod rewrite deflate expires headers \
    && a2dismod -f autoindex status \
    && apt-get purge -y --auto-remove pkg-config \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

# Configurações de baixo consumo de memória
COPY docker/php-lowmem.ini /usr/local/etc/php/conf.d/zz-lowmem.ini
COPY docker/apache-lowmem.conf /etc/apache2/conf-available/zz-lowmem.conf
RUN a2enconf zz-lowmem

# Código-fonte
WORKDIR /var/www/html
COPY . /var/www/html/

RUN rm -rf /var/www/html/docker \
    && sed -i 's/\r$//' /var/www/html/entrypoint.sh \
    && mkdir -p /tmp/familytree_cache \
    && chown -R www-data:www-data /var/www/html /tmp/familytree_cache \
    && chmod +x /var/www/html/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/var/www/html/entrypoint.sh"]
