#!/bin/sh

# https://stackoverflow.com/questions/59738140/why-is-firefox-not-trusting-my-self-signed-certificate
openssl req -x509 -nodes \
	-newkey RSA:2048 \
	-keyout root-ca.key \
	-days 365 \
	-out root-ca.pem \
	-subj '/C=US/ST=Denial/L=Earth/O=Atest/CN=root_CA_for_firefox'

openssl req -nodes \
	-newkey rsa:2048 \
	-keyout server.key \
	-out server.pem \
	-subj '/C=US/ST=Denial/L=Earth/O=Dis/CN=localhost_cert'

openssl x509 -req \
	-CA root-ca.pem \
	-CAkey root-ca.key \
	-in server.pem \
	-out server.pem \
	-days 365 \
	-CAcreateserial \
	-extfile openssl.ss.cnf

# convert to pkcs12
openssl pkcs12 -export -in server.pem -inkey server.key -out server.p12 -passout pass:

