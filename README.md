## Install dependencies

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
