## Install dependencies

[![Join the chat at https://gitter.im/subnetchat/Lobby](https://badges.gitter.im/subnetchat/Lobby.svg)](https://gitter.im/subnetchat/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

    npm install

or

    yarn

## Install postgres

https://www.postgresql.org/download/

## Setup schema

    curl https://raw.githubusercontent.com/jbaudanza/jindo/master/schema.sql > schema.sql
    createdb observables_development
    psql observables_development
    \i schema.sql

## Run

    npm start
