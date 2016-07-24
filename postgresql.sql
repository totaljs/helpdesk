-- Initial script for DB

CREATE TABLE public.tbl_ticket
(
  id character varying(30) NOT NULL,
  iduser character varying(30),
  iduserlast character varying(30),
  idsolver character varying(30),
  idsolution character varying(30), -- ID comment
  category character varying(50),
  project character varying(50),
  company character varying(50),
  name character varying(80),
  search character varying(80),
  linker character varying(80),
  language character varying(2),
  labels character varying(200),
  tags character varying(100),
  ip character varying(80),
  countcomments integer DEFAULT 0,
  countupdates integer DEFAULT 0,
  minutes integer DEFAULT 0,
  issolved boolean DEFAULT false,
  ispriority boolean DEFAULT false,
  isremoved boolean DEFAULT false,
  datesolved timestamp without time zone,
  datechanged timestamp without time zone,
  dateupdated timestamp without time zone,
  datecreated timestamp without time zone DEFAULT now(),
  CONSTRAINT tbl_ticket_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

CREATE TABLE public.tbl_ticket_comment
(
  id character varying(30) NOT NULL,
  idticket character varying(30),
  idparent character varying(30),
  iduser character varying(30),
  search character varying(300),
  ip character varying(80),
  body text,
  countupdates integer DEFAULT 0,
  operation smallint DEFAULT '0'::smallint,
  isoperation boolean DEFAULT false,
  issolution boolean DEFAULT false,
  isremoved boolean DEFAULT false,
  dateupdated timestamp without time zone,
  datecreated timestamp without time zone DEFAULT now(),
  CONSTRAINT tbl_ticket_comment_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

CREATE TABLE public.tbl_time
(
  id character varying(30) NOT NULL,
  idsolver character varying(30),
  iduser character varying(30),
  idticket character varying(30),
  company character varying(50),
  minutes integer DEFAULT 0,
  minutesuser integer DEFAULT 0,
  day smallint DEFAULT '0'::smallint,
  month smallint DEFAULT '0'::smallint,
  year smallint DEFAULT '0'::smallint,
  datecreated timestamp without time zone DEFAULT now(),
  CONSTRAINT tbl_time_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

CREATE TABLE public.tbl_user
(
  id character varying(30) NOT NULL,
  token character varying(50),
  photo character varying(30),
  name character varying(50),
  search character varying(200),
  language character varying(2),
  firstname character varying(30),
  lastname character varying(30),
  company character varying(50),
  "position" character varying(50),
  email character varying(200),
  password character varying(60),
  notes character varying(200),
  minutes smallint DEFAULT 0,
  ispriority boolean DEFAULT false,
  isremoved boolean DEFAULT false,
  isconfirmed boolean DEFAULT false,
  iscustomer boolean DEFAULT false,
  isadmin boolean DEFAULT false,
  isnotification boolean DEFAULT false,
  isactivated boolean DEFAULT false,
  countlogins smallint DEFAULT 0,
  countupdates smallint DEFAULT 0,
  datelogged timestamp without time zone,
  dateupdated timestamp without time zone,
  dateconfirmed timestamp without time zone,
  datecreated timestamp without time zone DEFAULT now(),
  CONSTRAINT tbl_user_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

-- DEFAULT ADMINISTRATOR
-- login: support@totaljs.com
-- password: 123456
INSERT INTO tbl_user (id, token, name, language, company, "position", email, password, isadmin, isconfirmed, isnotification, isactivated) VALUES('16072309220001xlu1', '97z8ctkw16tu11tasmin5iefmmijyr', 'Peter Sirka', '', 'Total.js', 'Developer', 'support@totaljs.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', true, true, true, true);

