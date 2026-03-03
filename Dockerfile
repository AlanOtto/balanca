# Use a imagem base oficial do Oracle Linux 8
FROM oraclelinux:8-slim

# Instale o microdnf e configure o repositório Oracle Instant Client
RUN microdnf -y install dnf && \
    # echo "Listando pacotes disponíveis para Oracle Instant Client antes da instalação..." && \
    # dnf search oracle-instantclient && \

    dnf -y install oracle-release-el8 && \
    dnf config-manager --enable ol8_oracle_instantclient && \

    # echo "Repositório configurado. Listando novamente os pacotes disponíveis..." && \
    # dnf list available | grep oracle-instantclient && \

    # echo "Instalando o Oracle Instant Client 19.10..." && \
    dnf -y install oracle-instantclient19.10-basic && \

    # echo "Listando os pacotes Oracle Instant Client instalados..." && \
    # dnf list installed | grep oracle-instantclient && \
    
    dnf clean all
    
# Habilitar e instalar a versão mais recente do Node.js
RUN dnf module enable -y nodejs:20 && \
    dnf install -y nodejs && \
    dnf clean all

# Instale o Yarn
RUN npm install -g yarn

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copie os arquivos package.json e yarn.lock para o contêiner
COPY package.json yarn.lock ./

# Instale as dependências da aplicação
RUN yarn install

# Copie o restante dos arquivos do projeto para o contêiner
COPY . .

# Compile a aplicação
RUN yarn build

# Defina a variável de ambiente LD_LIBRARY_PATH
ENV LD_LIBRARY_PATH=/usr/lib/oracle/client64/lib:$LD_LIBRARY_PATH

# Exponha a porta em que a aplicação estará rodando
EXPOSE 9013

# Comando para rodar a aplicação
CMD ["yarn", "start"]
