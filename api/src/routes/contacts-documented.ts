/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Récupérer la liste des contacts
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/searchParam'
 *       - $ref: '#/components/parameters/sortParam'
 *       - $ref: '#/components/parameters/orderParam'
 *       - name: type
 *         in: query
 *         description: Filtrer par type de contact
 *         schema:
 *           type: string
 *           enum: [lead, prospect, customer, partner]
 *       - name: source
 *         in: query
 *         description: Filtrer par source
 *         schema:
 *           type: string
 *           enum: [website, referral, social, direct, other]
 *       - name: score_min
 *         in: query
 *         description: Score minimum
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *       - name: tags
 *         in: query
 *         description: Filtrer par tags (séparés par des virgules)
 *         schema:
 *           type: string
 *           example: "vip,premium"
 *     responses:
 *       200:
 *         description: Liste des contacts avec pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *             example:
 *               data:
 *                 - id: "123e4567-e89b-12d3-a456-426614174000"
 *                   first_name: "Marie"
 *                   last_name: "Dupont"
 *                   email: "marie.dupont@example.com"
 *                   phone: "+33 6 12 34 56 78"
 *                   company_id: "456e7890-e89b-12d3-a456-426614174000"
 *                   type: "customer"
 *                   source: "website"
 *                   score: 85
 *                   tags: ["vip", "premium"]
 *                   created_at: "2024-01-15T10:30:00Z"
 *               pagination:
 *                 total: 150
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 15
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Créer un nouveau contact
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *             properties:
 *               first_name:
 *                 type: string
 *                 description: Prénom
 *               last_name:
 *                 type: string
 *                 description: Nom
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email
 *               phone:
 *                 type: string
 *                 description: Téléphone
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'entreprise
 *               position:
 *                 type: string
 *                 description: Poste occupé
 *               type:
 *                 type: string
 *                 enum: [lead, prospect, customer, partner]
 *                 default: lead
 *               source:
 *                 type: string
 *                 enum: [website, referral, social, direct, other]
 *                 default: direct
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *                 description: Données personnalisées
 *           example:
 *             first_name: "Jean"
 *             last_name: "Martin"
 *             email: "jean.martin@entreprise.fr"
 *             phone: "+33 6 98 76 54 32"
 *             company_id: "456e7890-e89b-12d3-a456-426614174000"
 *             position: "Directeur Commercial"
 *             type: "prospect"
 *             source: "referral"
 *             tags: ["decision-maker", "interested"]
 *     responses:
 *       201:
 *         description: Contact créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               duplicate:
 *                 value:
 *                   error: "A contact with this email already exists"
 *               validation:
 *                 value:
 *                   error: "Invalid email format"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     summary: Récupérer un contact par ID
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du contact
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails du contact
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     summary: Mettre à jour un contact
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du contact
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               company_id:
 *                 type: string
 *                 format: uuid
 *               position:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [lead, prospect, customer, partner]
 *               source:
 *                 type: string
 *                 enum: [website, referral, social, direct, other]
 *               score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Contact mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: Supprimer un contact (soft delete)
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du contact
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contact supprimé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Contact deleted successfully"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/contacts/deduplicate:
 *   post:
 *     summary: Détecter et fusionner les doublons
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threshold:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0.8
 *                 description: Seuil de similarité (0-1)
 *               dry_run:
 *                 type: boolean
 *                 default: true
 *                 description: Mode simulation (ne fusionne pas réellement)
 *           example:
 *             threshold: 0.85
 *             dry_run: false
 *     responses:
 *       200:
 *         description: Résultats de la déduplication
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 duplicates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       master:
 *                         $ref: '#/components/schemas/Contact'
 *                       duplicates:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Contact'
 *                       similarity:
 *                         type: number
 *                 merged:
 *                   type: integer
 *                   description: Nombre de contacts fusionnés
 *             example:
 *               duplicates:
 *                 - master:
 *                     id: "123e4567-e89b-12d3-a456-426614174000"
 *                     email: "marie.dupont@example.com"
 *                   duplicates:
 *                     - id: "456e7890-e89b-12d3-a456-426614174001"
 *                       email: "m.dupont@example.com"
 *                   similarity: 0.92
 *               merged: 3
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/contacts/{id}/score:
 *   post:
 *     summary: Calculer le score d'un contact
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du contact
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               factors:
 *                 type: object
 *                 properties:
 *                   engagement:
 *                     type: number
 *                     default: 1
 *                   recency:
 *                     type: number
 *                     default: 1
 *                   frequency:
 *                     type: number
 *                     default: 1
 *                   monetary:
 *                     type: number
 *                     default: 1
 *     responses:
 *       200:
 *         description: Score calculé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 score:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 100
 *                 breakdown:
 *                   type: object
 *                   properties:
 *                     engagement:
 *                       type: integer
 *                     recency:
 *                       type: integer
 *                     frequency:
 *                       type: integer
 *                     monetary:
 *                       type: integer
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *             example:
 *               score: 75
 *               breakdown:
 *                 engagement: 80
 *                 recency: 90
 *                 frequency: 60
 *                 monetary: 70
 *               recommendations:
 *                 - "Contact très engagé, envisager une offre premium"
 *                 - "Dernière interaction récente, maintenir le contact"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/contacts/{id}/activities:
 *   get:
 *     summary: Récupérer l'historique des activités d'un contact
 *     tags: [👥 CRM Core]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du contact
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - name: type
 *         in: query
 *         description: Type d'activité
 *         schema:
 *           type: string
 *           enum: [email, call, meeting, note, task]
 *     responses:
 *       200:
 *         description: Liste des activités
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       type:
 *                         type: string
 *                         enum: [email, call, meeting, note, task]
 *                       subject:
 *                         type: string
 *                       description:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

export {};