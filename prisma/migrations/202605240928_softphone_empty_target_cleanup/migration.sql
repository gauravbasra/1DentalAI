-- Remove invalid blocked softphone records created before target-number validation was tightened.
create temp table if not exists softphone_empty_target_cleanup_ids as
select "id"
from "PhoneConversation"
where "outcome" = 'SOFTPHONE_DIAL_CREATED'
  and coalesce("callerNumber", '') = ''
  and coalesce("transcriptSummary", '') like 'Softphone bridge requested.%';

delete from "PhoneCallControlAction"
where "conversationId" in (select "id" from softphone_empty_target_cleanup_ids);

delete from "PhoneActiveCall"
where "conversationId" in (select "id" from softphone_empty_target_cleanup_ids);

delete from "PhoneConversation"
where "id" in (select "id" from softphone_empty_target_cleanup_ids);

drop table if exists softphone_empty_target_cleanup_ids;
