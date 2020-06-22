\c demo
CREATE SCHEMA g AUTHORIZATION postgres;SET SCHEMA 'g';
CREATE EXTENSION pg_trgm with schema g;
CREATE OR REPLACE FUNCTION modifiedDtTrigger() RETURNS trigger AS $$ BEGIN  IF NEW.modifiedDt=OLD.modifiedDt THEN NEW.modifiedDt := NOW(); END IF; RETURN NEW; END;$$ LANGUAGE plpgsql;

CREATE TABLE g.users(id BIGSERIAL NOT NULL PRIMARY KEY, info JSONB, modifiedDt TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, effstatus SMALLINT DEFAULT 1);
CREATE TRIGGER usersModifiedDtTrig BEFORE UPDATE ON g.users FOR EACH ROW EXECUTE PROCEDURE g.modifiedDtTrigger();
CREATE INDEX usersEmailIdx ON g.users(JSONB_EXTRACT_PATH_TEXT(info,'email'));
CREATE INDEX usersMobileIdx ON g.users(JSONB_EXTRACT_PATH_TEXT(info,'mobile'));



INSERT INTO g.users(info) VALUES('{"name": "user3", "email": "user3@yopmail.com"}') RETURNING id;
