# API Design

## Authentication

POST /api/auth/login

## Users

GET /api/users POST /api/users PUT /api/users/:id

## Distributors

GET /api/distributors POST /api/distributors PUT /api/distributors/:id

## Daily Work

POST /api/work GET /api/work/daily GET /api/work/monthly

POST /api/work يعمل كـ upsert على (المعالج + التاريخ): إعادة الحفظ لنفس اليوم تعدّل السجل.

## Returns

GET /api/returns POST /api/returns PATCH /api/returns/:id

-   POST و PATCH للمعالج فقط.
-   PATCH يعدّل سجل المعالج نفسه فقط، ويعيد حساب `quantity` كمجموع الحالتين.
-   `quantity` لا تقبل أن تكون صفرية، ولا تقبل قيمة لا تساوي مجموع الحالتين.

## Reports

GET /api/reports/performance GET /api/reports/returns
