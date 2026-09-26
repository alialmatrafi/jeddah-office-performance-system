# Database ERD

## Users

-   id
-   name
-   username
-   password_hash
-   role
-   status
-   created_at

## Distributors

-   id
-   name
-   status
-   created_at
-   updated_at

## Districts

-   id
-   name

## Daily_Work

-   id
-   processor_id
-   date
-   time
-   excellent_mail
-   official_mail
-   registered_mail
-   government_docs
-   parcels
-   shipment_entries

## Distribution_Entries

-   id
-   daily_work_id
-   distributor_id
-   district_id
-   quantity

## Returns

-   id
-   distributor_id
-   processor_id
-   quantity (total = supervisor_received_quantity + office_reissue_quantity)
-   supervisor_received_quantity
-   office_reissue_quantity
-   note
-   created_at

## Violations

-   id
-   distributor_id
-   reason
-   created_by
-   created_at

## Audit_Logs

-   id
-   user_id
-   action
-   created_at
