--
-- PostgreSQL database dump
--

\restrict UuYoeQGCH83eayrVC1aZAHc9p6KxT8SFCmpYlF1P051bDGVU84Mgp6xPfwvi09L

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', '5ef39b87-a2f7-4be8-8668-9d090776b41f', 'authenticated', 'authenticated', 'gardens@gardens.com', '$2a$10$f5LroEslOhLcC8aGjRefIuU216YV/YebhjtKpGs2IsmxNPkz8XkkK', '2026-04-16 21:25:50.14412+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-23 03:49:23.927654+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "5ef39b87-a2f7-4be8-8668-9d090776b41f", "email": "gardens@gardens.com", "username": "gardens", "full_name": "Gardens", "email_verified": true, "phone_verified": false}', NULL, '2026-04-16 21:25:50.129847+00', '2026-04-23 03:49:23.933919+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', '2b656e4c-c944-4de2-931b-44447067fadf', 'authenticated', 'authenticated', 'dev@gardens.com', '$2a$10$scZEgBKIGMy.LTqMWlj9oeesxLT2ovDjJwqn4/GUs3faAtbwII/uG', '2026-04-22 20:25:37.366877+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-23 03:51:34.118311+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "2b656e4c-c944-4de2-931b-44447067fadf", "email": "dev@gardens.com", "username": "dev", "full_name": "Desenvolvedor", "email_verified": true, "phone_verified": false}', NULL, '2026-04-22 20:25:37.319977+00', '2026-04-23 03:51:34.129337+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('5ef39b87-a2f7-4be8-8668-9d090776b41f', '5ef39b87-a2f7-4be8-8668-9d090776b41f', '{"sub": "5ef39b87-a2f7-4be8-8668-9d090776b41f", "email": "gardens@gardens.com", "username": "gardens", "full_name": "Gardens", "email_verified": false, "phone_verified": false}', 'email', '2026-04-16 21:25:50.137087+00', '2026-04-16 21:25:50.13718+00', '2026-04-16 21:25:50.13718+00', '54f8475a-f5b5-496e-ab4a-74693a1fb926');
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('2b656e4c-c944-4de2-931b-44447067fadf', '2b656e4c-c944-4de2-931b-44447067fadf', '{"sub": "2b656e4c-c944-4de2-931b-44447067fadf", "email": "dev@gardens.com", "username": "dev", "full_name": "Desenvolvedor", "email_verified": false, "phone_verified": false}', 'email', '2026-04-22 20:25:37.358683+00', '2026-04-22 20:25:37.358736+00', '2026-04-22 20:25:37.358736+00', 'c5aaeb0e-fc71-4e7d-b3ad-fadb619023e0');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) VALUES ('b9184fc1-4780-432b-84b4-4819cec19f1d', '5ef39b87-a2f7-4be8-8668-9d090776b41f', '2026-04-23 03:49:23.928385+00', '2026-04-23 03:49:23.928385+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0', '138.186.197.249', NULL, NULL, NULL, NULL, NULL);
INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) VALUES ('5ff82e46-e69a-4f03-9dac-305b7834f692', '2b656e4c-c944-4de2-931b-44447067fadf', '2026-04-23 03:51:34.11842+00', '2026-04-23 03:51:34.11842+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0', '138.186.197.249', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) VALUES ('b9184fc1-4780-432b-84b4-4819cec19f1d', '2026-04-23 03:49:23.934555+00', '2026-04-23 03:49:23.934555+00', 'password', 'fd95838d-4902-4a58-b86d-abd6834ad444');
INSERT INTO auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) VALUES ('5ff82e46-e69a-4f03-9dac-305b7834f692', '2026-04-23 03:51:34.13049+00', '2026-04-23 03:51:34.13049+00', 'password', 'b01a777f-33ef-4a5d-86f7-4978f0a287d3');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) VALUES ('00000000-0000-0000-0000-000000000000', 53, 'bma6gaqvkjld', '5ef39b87-a2f7-4be8-8668-9d090776b41f', false, '2026-04-23 03:49:23.932659+00', '2026-04-23 03:49:23.932659+00', NULL, 'b9184fc1-4780-432b-84b4-4819cec19f1d');
INSERT INTO auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) VALUES ('00000000-0000-0000-0000-000000000000', 54, '6zkzjnj3wnni', '2b656e4c-c944-4de2-931b-44447067fadf', false, '2026-04-23 03:51:34.126945+00', '2026-04-23 03:51:34.126945+00', NULL, '5ff82e46-e69a-4f03-9dac-305b7834f692');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.schema_migrations (version) VALUES ('20171026211738');
INSERT INTO auth.schema_migrations (version) VALUES ('20171026211808');
INSERT INTO auth.schema_migrations (version) VALUES ('20171026211834');
INSERT INTO auth.schema_migrations (version) VALUES ('20180103212743');
INSERT INTO auth.schema_migrations (version) VALUES ('20180108183307');
INSERT INTO auth.schema_migrations (version) VALUES ('20180119214651');
INSERT INTO auth.schema_migrations (version) VALUES ('20180125194653');
INSERT INTO auth.schema_migrations (version) VALUES ('00');
INSERT INTO auth.schema_migrations (version) VALUES ('20210710035447');
INSERT INTO auth.schema_migrations (version) VALUES ('20210722035447');
INSERT INTO auth.schema_migrations (version) VALUES ('20210730183235');
INSERT INTO auth.schema_migrations (version) VALUES ('20210909172000');
INSERT INTO auth.schema_migrations (version) VALUES ('20210927181326');
INSERT INTO auth.schema_migrations (version) VALUES ('20211122151130');
INSERT INTO auth.schema_migrations (version) VALUES ('20211124214934');
INSERT INTO auth.schema_migrations (version) VALUES ('20211202183645');
INSERT INTO auth.schema_migrations (version) VALUES ('20220114185221');
INSERT INTO auth.schema_migrations (version) VALUES ('20220114185340');
INSERT INTO auth.schema_migrations (version) VALUES ('20220224000811');
INSERT INTO auth.schema_migrations (version) VALUES ('20220323170000');
INSERT INTO auth.schema_migrations (version) VALUES ('20220429102000');
INSERT INTO auth.schema_migrations (version) VALUES ('20220531120530');
INSERT INTO auth.schema_migrations (version) VALUES ('20220614074223');
INSERT INTO auth.schema_migrations (version) VALUES ('20220811173540');
INSERT INTO auth.schema_migrations (version) VALUES ('20221003041349');
INSERT INTO auth.schema_migrations (version) VALUES ('20221003041400');
INSERT INTO auth.schema_migrations (version) VALUES ('20221011041400');
INSERT INTO auth.schema_migrations (version) VALUES ('20221020193600');
INSERT INTO auth.schema_migrations (version) VALUES ('20221021073300');
INSERT INTO auth.schema_migrations (version) VALUES ('20221021082433');
INSERT INTO auth.schema_migrations (version) VALUES ('20221027105023');
INSERT INTO auth.schema_migrations (version) VALUES ('20221114143122');
INSERT INTO auth.schema_migrations (version) VALUES ('20221114143410');
INSERT INTO auth.schema_migrations (version) VALUES ('20221125140132');
INSERT INTO auth.schema_migrations (version) VALUES ('20221208132122');
INSERT INTO auth.schema_migrations (version) VALUES ('20221215195500');
INSERT INTO auth.schema_migrations (version) VALUES ('20221215195800');
INSERT INTO auth.schema_migrations (version) VALUES ('20221215195900');
INSERT INTO auth.schema_migrations (version) VALUES ('20230116124310');
INSERT INTO auth.schema_migrations (version) VALUES ('20230116124412');
INSERT INTO auth.schema_migrations (version) VALUES ('20230131181311');
INSERT INTO auth.schema_migrations (version) VALUES ('20230322519590');
INSERT INTO auth.schema_migrations (version) VALUES ('20230402418590');
INSERT INTO auth.schema_migrations (version) VALUES ('20230411005111');
INSERT INTO auth.schema_migrations (version) VALUES ('20230508135423');
INSERT INTO auth.schema_migrations (version) VALUES ('20230523124323');
INSERT INTO auth.schema_migrations (version) VALUES ('20230818113222');
INSERT INTO auth.schema_migrations (version) VALUES ('20230914180801');
INSERT INTO auth.schema_migrations (version) VALUES ('20231027141322');
INSERT INTO auth.schema_migrations (version) VALUES ('20231114161723');
INSERT INTO auth.schema_migrations (version) VALUES ('20231117164230');
INSERT INTO auth.schema_migrations (version) VALUES ('20240115144230');
INSERT INTO auth.schema_migrations (version) VALUES ('20240214120130');
INSERT INTO auth.schema_migrations (version) VALUES ('20240306115329');
INSERT INTO auth.schema_migrations (version) VALUES ('20240314092811');
INSERT INTO auth.schema_migrations (version) VALUES ('20240427152123');
INSERT INTO auth.schema_migrations (version) VALUES ('20240612123726');
INSERT INTO auth.schema_migrations (version) VALUES ('20240729123726');
INSERT INTO auth.schema_migrations (version) VALUES ('20240802193726');
INSERT INTO auth.schema_migrations (version) VALUES ('20240806073726');
INSERT INTO auth.schema_migrations (version) VALUES ('20241009103726');
INSERT INTO auth.schema_migrations (version) VALUES ('20250717082212');
INSERT INTO auth.schema_migrations (version) VALUES ('20250731150234');
INSERT INTO auth.schema_migrations (version) VALUES ('20250804100000');
INSERT INTO auth.schema_migrations (version) VALUES ('20250901200500');
INSERT INTO auth.schema_migrations (version) VALUES ('20250903112500');
INSERT INTO auth.schema_migrations (version) VALUES ('20250904133000');
INSERT INTO auth.schema_migrations (version) VALUES ('20250925093508');
INSERT INTO auth.schema_migrations (version) VALUES ('20251007112900');
INSERT INTO auth.schema_migrations (version) VALUES ('20251104100000');
INSERT INTO auth.schema_migrations (version) VALUES ('20251111201300');
INSERT INTO auth.schema_migrations (version) VALUES ('20251201000000');
INSERT INTO auth.schema_migrations (version) VALUES ('20260115000000');
INSERT INTO auth.schema_migrations (version) VALUES ('20260121000000');
INSERT INTO auth.schema_migrations (version) VALUES ('20260219120000');
INSERT INTO auth.schema_migrations (version) VALUES ('20260302000000');


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--



--
-- Data for Name: cash_closings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: cash_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categorias (id, nome, emoji) VALUES ('d5b986f9-0dff-426a-bcd9-74a4114ec6a9', 'Lanches de Hambúrguer', '🍔');
INSERT INTO public.categorias (id, nome, emoji) VALUES ('80ba6b7f-f0aa-4570-ace1-d1e4e6ced7cc', 'Lanches de Frango', '🍗');
INSERT INTO public.categorias (id, nome, emoji) VALUES ('d4988bb6-4c1b-4ed0-a951-f22205b9907f', 'Lanches de Calabresa', '🍖');
INSERT INTO public.categorias (id, nome, emoji) VALUES ('dd1ece38-90ad-458b-a194-52f7c0a2c37f', 'Lanches Leves', '🥪');
INSERT INTO public.categorias (id, nome, emoji) VALUES ('bbb8c12b-1a72-48ad-a422-1afe33933e88', 'Lanches Especiais', '🌟');
INSERT INTO public.categorias (id, nome, emoji) VALUES ('0559cfdd-0351-460d-a42a-c3beb5b3cffa', 'Hot Dog', '🌭');
INSERT INTO public.categorias (id, nome, emoji) VALUES ('859567a6-4c37-4e69-b7f2-dfbe1a514dfa', 'Adicionais', '➕');
INSERT INTO public.categorias (id, nome, emoji) VALUES ('8aa6695e-a025-467c-934c-30c46da26224', 'Bebidas', '🥤');


--
-- Data for Name: pedidos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: pedido_itens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: produtos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('2a257ad0-a208-4605-a9f5-bb1ad64f3a83', 'X-Egg', 24.00, 'd5b986f9-0dff-426a-bcd9-74a4114ec6a9', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('82cb04c7-d2ba-49fc-9879-253f947ce139', 'X-Bacon', 26.00, 'd5b986f9-0dff-426a-bcd9-74a4114ec6a9', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('a09757c6-deb1-4030-baed-9776d1baa9b3', 'X-Tudo', 28.00, 'd5b986f9-0dff-426a-bcd9-74a4114ec6a9', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('d96b3f5d-7bc0-42fe-9447-c5ed1faaec41', 'X-Gordinho', 36.00, 'd5b986f9-0dff-426a-bcd9-74a4114ec6a9', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('064823e6-b271-4db5-a852-4a67f9bacfda', 'X-Frango', 27.00, '80ba6b7f-f0aa-4570-ace1-d1e4e6ced7cc', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('82848da2-ec22-4762-baf4-978fe2f3df74', 'X-Franbacon', 30.00, '80ba6b7f-f0aa-4570-ace1-d1e4e6ced7cc', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('5c19df14-6fe6-4e67-9fb0-38071a979247', 'X-Frangão', 32.00, '80ba6b7f-f0aa-4570-ace1-d1e4e6ced7cc', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('8ba4b4be-2858-49d1-ad6f-62c94a84e893', 'X-Calabresa', 24.00, 'd4988bb6-4c1b-4ed0-a951-f22205b9907f', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('b1d36a05-a09b-457a-9ee7-7497248d4898', 'X-Calabacon', 28.00, 'd4988bb6-4c1b-4ed0-a951-f22205b9907f', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('a3c6c782-34dc-4565-9468-220dfa192731', 'X-Calafrango', 32.00, 'd4988bb6-4c1b-4ed0-a951-f22205b9907f', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('fb2a7be1-c685-4c24-845c-a1a4a55fe8c3', 'Misto Quente', 14.00, 'dd1ece38-90ad-458b-a194-52f7c0a2c37f', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('ff2cb72b-cd47-406d-b9d0-800e9f1ec1e0', 'Americano', 17.00, 'dd1ece38-90ad-458b-a194-52f7c0a2c37f', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('97a10f2d-7fca-469a-8cc7-d53d497e231f', 'Bauru', 33.00, 'bbb8c12b-1a72-48ad-a422-1afe33933e88', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('4eda9299-6428-4664-82f4-665c8435cbbf', 'X-Tudão', 40.00, 'bbb8c12b-1a72-48ad-a422-1afe33933e88', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('9af1fab1-f7c6-4684-8c43-bfae5d8ab069', 'Duplo', 18.00, '0559cfdd-0351-460d-a42a-c3beb5b3cffa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('2252763d-5c8a-4421-bf8b-6a221db1f0c7', 'Dog Especial', 27.00, '0559cfdd-0351-460d-a42a-c3beb5b3cffa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('a61b2abd-409e-4bcb-a770-495093743014', '+ Catupiry', 3.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('17c21b33-c3d7-4364-a7b4-8aec9230534d', '+ Bacon', 6.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('7cc05d54-8ab7-46c2-ba70-cd4eb4eabe69', '+ Hambúrguer', 6.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('ca62d950-d5a2-424b-9465-279dd6defb64', '+ Ovo', 3.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('d3060c75-74f7-4595-8ee7-bd8b85a07014', '+ Salsicha', 3.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('35bfc1a2-b7df-4e88-8ff0-d69df6772c5b', '+ Calabresa', 6.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('c10eb231-d905-4ff0-97fa-506ce43da6d8', '+ Presunto', 3.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('cd4fc830-59c3-41c7-90c6-6b28fe1625ae', '+ Queijo', 3.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('35fe0be5-155b-4118-b957-628b629a51a9', '+ Frango', 6.00, '859567a6-4c37-4e69-b7f2-dfbe1a514dfa', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('a70d1b41-aeb7-4df9-8431-518dcf2fe016', 'Coca 2L', 16.00, '8aa6695e-a025-467c-934c-30c46da26224', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('0b9e4879-0803-4f17-abc3-10006fbd11d6', 'Esportivo 2L', 10.00, '8aa6695e-a025-467c-934c-30c46da26224', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('de7bc7d0-6aa0-4b00-99d8-a11b4afbef99', 'Suco', 7.00, '8aa6695e-a025-467c-934c-30c46da26224', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('823df0d1-2fad-43f4-bdb6-aff5ea1e5a9c', 'Refri Lata', 6.00, '8aa6695e-a025-467c-934c-30c46da26224', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('458e9fdc-5a8c-4049-94ae-00c16830349a', 'Cerveja Lata', 6.00, '8aa6695e-a025-467c-934c-30c46da26224', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('777d914c-7a31-4c4a-b1d0-fcdb9efce3ae', 'Água', 3.00, '8aa6695e-a025-467c-934c-30c46da26224', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('f622089a-d9c2-4eee-b3f5-2771e8b0d8da', 'Água C/ Gás', 4.00, '8aa6695e-a025-467c-934c-30c46da26224', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('9fc9852e-215a-4a39-814c-6ebca32802dc', 'X-Burguer', 16.00, 'd5b986f9-0dff-426a-bcd9-74a4114ec6a9', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('977b103c-8984-4528-b454-78c434528a7c', 'X-Hambúrguer', 16.00, 'd5b986f9-0dff-426a-bcd9-74a4114ec6a9', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('78e5eab7-1dca-48f3-b4fd-13a1b70a5ace', 'X-Salada', 22.00, 'd5b986f9-0dff-426a-bcd9-74a4114ec6a9', true);
INSERT INTO public.produtos (id, nome, preco, categoria_id, ativo) VALUES ('e428451e-99fb-4c2c-a185-b16c77ba14e3', 'Heineken', 10.00, '8aa6695e-a025-467c-934c-30c46da26224', true);


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.usuarios (id, nome, username, password, criado_em) VALUES ('5ef39b87-a2f7-4be8-8668-9d090776b41f', 'Gardens', 'gardens', NULL, '2026-04-16 21:25:50.129524+00');
INSERT INTO public.usuarios (id, nome, username, password, criado_em) VALUES ('2b656e4c-c944-4de2-931b-44447067fadf', 'Desenvolvedor', 'dev', NULL, '2026-04-22 20:25:37.319624+00');


--
-- Data for Name: messages_2026_04_22; Type: TABLE DATA; Schema: realtime; Owner: -
--



--
-- Data for Name: messages_2026_04_23; Type: TABLE DATA; Schema: realtime; Owner: -
--



--
-- Data for Name: messages_2026_04_24; Type: TABLE DATA; Schema: realtime; Owner: -
--



--
-- Data for Name: messages_2026_04_25; Type: TABLE DATA; Schema: realtime; Owner: -
--



--
-- Data for Name: messages_2026_04_26; Type: TABLE DATA; Schema: realtime; Owner: -
--



--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116024918, '2026-04-14 01:26:21');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116045059, '2026-04-14 01:26:23');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116050929, '2026-04-14 01:26:24');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116051442, '2026-04-14 01:26:25');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116212300, '2026-04-14 01:26:26');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116213355, '2026-04-14 01:26:27');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116213934, '2026-04-14 01:26:29');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211116214523, '2026-04-14 01:26:30');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211122062447, '2026-04-14 01:26:31');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211124070109, '2026-04-14 01:26:32');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211202204204, '2026-04-14 01:26:34');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211202204605, '2026-04-14 01:26:35');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211210212804, '2026-04-14 01:26:38');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20211228014915, '2026-04-14 01:26:39');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220107221237, '2026-04-14 01:26:41');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220228202821, '2026-04-14 01:26:42');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220312004840, '2026-04-14 01:26:43');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220603231003, '2026-04-14 01:26:45');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220603232444, '2026-04-14 01:26:46');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220615214548, '2026-04-14 01:26:47');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220712093339, '2026-04-14 01:26:48');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220908172859, '2026-04-14 01:26:49');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20220916233421, '2026-04-14 01:26:51');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20230119133233, '2026-04-14 01:26:52');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20230128025114, '2026-04-14 01:26:53');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20230128025212, '2026-04-14 01:26:54');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20230227211149, '2026-04-14 01:26:56');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20230228184745, '2026-04-14 01:26:57');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20230308225145, '2026-04-14 01:26:58');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20230328144023, '2026-04-14 01:26:59');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20231018144023, '2026-04-14 01:27:00');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20231204144023, '2026-04-14 01:27:02');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20231204144024, '2026-04-14 01:27:03');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20231204144025, '2026-04-14 01:27:05');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240108234812, '2026-04-14 01:27:06');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240109165339, '2026-04-14 01:27:07');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240227174441, '2026-04-14 01:27:09');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240311171622, '2026-04-14 01:27:10');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240321100241, '2026-04-14 01:27:13');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240401105812, '2026-04-14 01:27:16');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240418121054, '2026-04-14 01:27:18');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240523004032, '2026-04-14 01:27:22');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240618124746, '2026-04-14 01:27:24');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240801235015, '2026-04-14 01:27:25');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240805133720, '2026-04-14 01:27:26');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240827160934, '2026-04-14 01:27:27');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240919163303, '2026-04-14 01:27:29');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20240919163305, '2026-04-14 01:27:30');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241019105805, '2026-04-14 01:27:32');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241030150047, '2026-04-14 01:27:36');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241108114728, '2026-04-14 01:27:38');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241121104152, '2026-04-14 01:27:39');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241130184212, '2026-04-14 01:27:40');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241220035512, '2026-04-14 01:27:42');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241220123912, '2026-04-14 01:27:43');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20241224161212, '2026-04-14 01:27:44');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250107150512, '2026-04-14 01:27:46');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250110162412, '2026-04-14 01:27:47');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250123174212, '2026-04-14 01:27:48');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250128220012, '2026-04-14 01:27:49');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250506224012, '2026-04-14 01:27:50');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250523164012, '2026-04-14 01:27:52');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250714121412, '2026-04-14 01:27:53');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20250905041441, '2026-04-14 01:27:54');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20251103001201, '2026-04-14 01:27:55');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20251120212548, '2026-04-14 01:27:57');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20251120215549, '2026-04-14 01:27:58');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20260218120000, '2026-04-14 01:28:00');
INSERT INTO realtime.schema_migrations (version, inserted_at) VALUES (20260326120000, '2026-04-14 01:28:01');


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (0, 'create-migrations-table', 'e18db593bcde2aca2a408c4d1100f6abba2195df', '2026-04-14 01:23:00.365564');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (1, 'initialmigration', '6ab16121fbaa08bbd11b712d05f358f9b555d777', '2026-04-14 01:23:00.440406');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (2, 'storage-schema', 'f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd', '2026-04-14 01:23:00.444367');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (3, 'pathtoken-column', '2cb1b0004b817b29d5b0a971af16bafeede4b70d', '2026-04-14 01:23:00.46899');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (4, 'add-migrations-rls', '427c5b63fe1c5937495d9c635c263ee7a5905058', '2026-04-14 01:23:00.482448');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (5, 'add-size-functions', '79e081a1455b63666c1294a440f8ad4b1e6a7f84', '2026-04-14 01:23:00.486003');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (6, 'change-column-name-in-get-size', 'ded78e2f1b5d7e616117897e6443a925965b30d2', '2026-04-14 01:23:00.48978');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (7, 'add-rls-to-buckets', 'e7e7f86adbc51049f341dfe8d30256c1abca17aa', '2026-04-14 01:23:00.494532');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (8, 'add-public-to-buckets', 'fd670db39ed65f9d08b01db09d6202503ca2bab3', '2026-04-14 01:23:00.497903');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (9, 'fix-search-function', 'af597a1b590c70519b464a4ab3be54490712796b', '2026-04-14 01:23:00.501372');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (10, 'search-files-search-function', 'b595f05e92f7e91211af1bbfe9c6a13bb3391e16', '2026-04-14 01:23:00.504754');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (11, 'add-trigger-to-auto-update-updated_at-column', '7425bdb14366d1739fa8a18c83100636d74dcaa2', '2026-04-14 01:23:00.508405');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (12, 'add-automatic-avif-detection-flag', '8e92e1266eb29518b6a4c5313ab8f29dd0d08df9', '2026-04-14 01:23:00.512529');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (13, 'add-bucket-custom-limits', 'cce962054138135cd9a8c4bcd531598684b25e7d', '2026-04-14 01:23:00.516117');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (14, 'use-bytes-for-max-size', '941c41b346f9802b411f06f30e972ad4744dad27', '2026-04-14 01:23:00.519518');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (15, 'add-can-insert-object-function', '934146bc38ead475f4ef4b555c524ee5d66799e5', '2026-04-14 01:23:00.543184');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (16, 'add-version', '76debf38d3fd07dcfc747ca49096457d95b1221b', '2026-04-14 01:23:00.547284');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (17, 'drop-owner-foreign-key', 'f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101', '2026-04-14 01:23:00.551187');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (18, 'add_owner_id_column_deprecate_owner', 'e7a511b379110b08e2f214be852c35414749fe66', '2026-04-14 01:23:00.554478');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (19, 'alter-default-value-objects-id', '02e5e22a78626187e00d173dc45f58fa66a4f043', '2026-04-14 01:23:00.559752');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (20, 'list-objects-with-delimiter', 'cd694ae708e51ba82bf012bba00caf4f3b6393b7', '2026-04-14 01:23:00.56354');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (21, 's3-multipart-uploads', '8c804d4a566c40cd1e4cc5b3725a664a9303657f', '2026-04-14 01:23:00.56913');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (22, 's3-multipart-uploads-big-ints', '9737dc258d2397953c9953d9b86920b8be0cdb73', '2026-04-14 01:23:00.584819');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (23, 'optimize-search-function', '9d7e604cddc4b56a5422dc68c9313f4a1b6f132c', '2026-04-14 01:23:00.593829');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (24, 'operation-function', '8312e37c2bf9e76bbe841aa5fda889206d2bf8aa', '2026-04-14 01:23:00.598399');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (25, 'custom-metadata', 'd974c6057c3db1c1f847afa0e291e6165693b990', '2026-04-14 01:23:00.601887');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (26, 'objects-prefixes', '215cabcb7f78121892a5a2037a09fedf9a1ae322', '2026-04-14 01:23:00.605937');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (27, 'search-v2', '859ba38092ac96eb3964d83bf53ccc0b141663a6', '2026-04-14 01:23:00.609733');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (28, 'object-bucket-name-sorting', 'c73a2b5b5d4041e39705814fd3a1b95502d38ce4', '2026-04-14 01:23:00.613058');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (29, 'create-prefixes', 'ad2c1207f76703d11a9f9007f821620017a66c21', '2026-04-14 01:23:00.615898');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (30, 'update-object-levels', '2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6', '2026-04-14 01:23:00.619667');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (31, 'objects-level-index', 'b40367c14c3440ec75f19bbce2d71e914ddd3da0', '2026-04-14 01:23:00.623142');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (32, 'backward-compatible-index-on-objects', 'e0c37182b0f7aee3efd823298fb3c76f1042c0f7', '2026-04-14 01:23:00.626525');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (33, 'backward-compatible-index-on-prefixes', 'b480e99ed951e0900f033ec4eb34b5bdcb4e3d49', '2026-04-14 01:23:00.62969');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (34, 'optimize-search-function-v1', 'ca80a3dc7bfef894df17108785ce29a7fc8ee456', '2026-04-14 01:23:00.632852');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (35, 'add-insert-trigger-prefixes', '458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc', '2026-04-14 01:23:00.635985');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (36, 'optimise-existing-functions', '6ae5fca6af5c55abe95369cd4f93985d1814ca8f', '2026-04-14 01:23:00.638475');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (37, 'add-bucket-name-length-trigger', '3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1', '2026-04-14 01:23:00.641082');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (38, 'iceberg-catalog-flag-on-buckets', '02716b81ceec9705aed84aa1501657095b32e5c5', '2026-04-14 01:23:00.645194');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (39, 'add-search-v2-sort-support', '6706c5f2928846abee18461279799ad12b279b78', '2026-04-14 01:23:00.656065');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (40, 'fix-prefix-race-conditions-optimized', '7ad69982ae2d372b21f48fc4829ae9752c518f6b', '2026-04-14 01:23:00.658738');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (41, 'add-object-level-update-trigger', '07fcf1a22165849b7a029deed059ffcde08d1ae0', '2026-04-14 01:23:00.661525');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (42, 'rollback-prefix-triggers', '771479077764adc09e2ea2043eb627503c034cd4', '2026-04-14 01:23:00.66451');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (43, 'fix-object-level', '84b35d6caca9d937478ad8a797491f38b8c2979f', '2026-04-14 01:23:00.668128');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (44, 'vector-bucket-type', '99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3', '2026-04-14 01:23:00.671045');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (45, 'vector-buckets', '049e27196d77a7cb76497a85afae669d8b230953', '2026-04-14 01:23:00.674526');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (46, 'buckets-objects-grants', 'fedeb96d60fefd8e02ab3ded9fbde05632f84aed', '2026-04-14 01:23:00.683995');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (47, 'iceberg-table-metadata', '649df56855c24d8b36dd4cc1aeb8251aa9ad42c2', '2026-04-14 01:23:00.68784');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (48, 'iceberg-catalog-ids', 'e0e8b460c609b9999ccd0df9ad14294613eed939', '2026-04-14 01:23:00.690576');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (49, 'buckets-objects-grants-postgres', '072b1195d0d5a2f888af6b2302a1938dd94b8b3d', '2026-04-14 01:23:00.705377');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (50, 'search-v2-optimised', '6323ac4f850aa14e7387eb32102869578b5bd478', '2026-04-14 01:23:00.709408');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (51, 'index-backward-compatible-search', '2ee395d433f76e38bcd3856debaf6e0e5b674011', '2026-04-14 01:23:01.463151');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (52, 'drop-not-used-indexes-and-functions', '5cc44c8696749ac11dd0dc37f2a3802075f3a171', '2026-04-14 01:23:01.464888');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (53, 'drop-index-lower-name', 'd0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854', '2026-04-14 01:23:01.47323');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (54, 'drop-index-object-level', '6289e048b1472da17c31a7eba1ded625a6457e67', '2026-04-14 01:23:01.475401');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (55, 'prevent-direct-deletes', '262a4798d5e0f2e7c8970232e03ce8be695d5819', '2026-04-14 01:23:01.476848');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (56, 'fix-optimized-search-function', 'cb58526ebc23048049fd5bf2fd148d18b04a2073', '2026-04-14 01:23:01.48068');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (57, 's3-multipart-uploads-metadata', 'f127886e00d1b374fadbc7c6b31e09336aad5287', '2026-04-14 01:23:01.485238');
INSERT INTO storage.migrations (id, name, hash, executed_at) VALUES (58, 'operation-ergonomics', '00ca5d483b3fe0d522133d9002ccc5df98365120', '2026-04-14 01:23:01.488154');


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 54, true);


--
-- Name: cash_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cash_sessions_id_seq', 4, true);


--
-- Name: pedido_itens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pedido_itens_id_seq', 129, true);


--
-- Name: pedidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pedidos_id_seq', 28, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 24, true);


--
-- PostgreSQL database dump complete
--

\unrestrict UuYoeQGCH83eayrVC1aZAHc9p6KxT8SFCmpYlF1P051bDGVU84Mgp6xPfwvi09L

