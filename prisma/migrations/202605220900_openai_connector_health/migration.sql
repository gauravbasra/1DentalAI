insert into "ConnectorHealthCheck" ("id", "tenantId", "definitionId", "installationId", "checkType", "status", "resultSummary", "latencyMs")
values
  ('conn_health_openai_credential_vault', 'tenant_1dentalai_production', 'conn_def_ai_model_router', 'conn_inst_ai_enterprise', 'CREDENTIAL_VAULT_OPENAI', 'NOT_RUN', 'Waiting on OpenAI API key in credential vault, BAA/model policy approval, PHI retention controls, and a non-PHI Responses API smoke test.', null)
on conflict ("id") do nothing;
