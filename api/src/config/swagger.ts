import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🚀 Simplix CRM API',
      version: '4.0.0',
      description: `
        ## 📋 API complète du CRM Simplix

        Cette documentation interactive vous permet de tester tous les endpoints de l'API Simplix CRM.

        ### 🔐 Authentification
        Utilisez l'endpoint \`/api/auth/login\` pour obtenir un token JWT.
        Cliquez sur le bouton **Authorize** 🔓 et entrez votre token dans le format: \`Bearer YOUR_TOKEN\`

        ### 📊 Statistiques
        - **40+ modules** disponibles
        - **349+ endpoints** documentés
        - **60+ tables** de base de données

        ### 🧪 Environnement de test
        - Email: \`admin@admin.com\`
        - Mot de passe: \`Admin123!\`

        ### 🏷️ Catégories
        Les endpoints sont organisés par domaine fonctionnel pour faciliter la navigation.
      `,
      contact: {
        name: 'Simplix Support',
        email: 'support@simplix.com',
        url: 'https://simplix.com'
      },
      license: {
        name: 'Proprietary',
        url: 'https://simplix.com/license'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '🏠 Développement local'
      },
      {
        url: 'https://api.simplix.com',
        description: '🌍 Production'
      },
      {
        url: 'https://sandbox.simplix.com',
        description: '🧪 Sandbox (données de test)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre token JWT obtenu via /api/auth/login'
        }
      },
      schemas: {
        // Schémas de base
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Message d\'erreur'
            },
            details: {
              type: 'object',
              description: 'Détails additionnels'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message de succès'
            },
            data: {
              type: 'object',
              description: 'Données retournées'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Nombre total d\'éléments'
            },
            page: {
              type: 'integer',
              description: 'Page actuelle'
            },
            limit: {
              type: 'integer',
              description: 'Limite par page'
            },
            totalPages: {
              type: 'integer',
              description: 'Nombre total de pages'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Identifiant unique'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Adresse email'
            },
            first_name: {
              type: 'string',
              description: 'Prénom'
            },
            last_name: {
              type: 'string',
              description: 'Nom'
            },
            role_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID du rôle'
            },
            organization_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID de l\'organisation'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Contact: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            first_name: {
              type: 'string',
              description: 'Prénom du contact'
            },
            last_name: {
              type: 'string',
              description: 'Nom du contact'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            phone: {
              type: 'string',
              description: 'Numéro de téléphone'
            },
            company_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID de l\'entreprise associée'
            },
            type: {
              type: 'string',
              enum: ['lead', 'prospect', 'customer', 'partner'],
              description: 'Type de contact'
            },
            source: {
              type: 'string',
              enum: ['website', 'referral', 'social', 'direct', 'other'],
              description: 'Source du contact'
            },
            score: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Score du contact (0-100)'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tags associés'
            },
            metadata: {
              type: 'object',
              description: 'Données additionnelles'
            }
          }
        },
        Deal: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string',
              description: 'Titre de l\'opportunité'
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Montant de l\'opportunité'
            },
            stage: {
              type: 'string',
              enum: ['new', 'qualified', 'proposition', 'negotiation', 'won', 'lost'],
              description: 'Étape actuelle'
            },
            probability: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Probabilité de closing (%)'
            },
            contact_id: {
              type: 'string',
              format: 'uuid',
              description: 'Contact associé'
            },
            expected_close_date: {
              type: 'string',
              format: 'date',
              description: 'Date de closing prévue'
            },
            pipeline_id: {
              type: 'string',
              format: 'uuid',
              description: 'Pipeline associé'
            }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            invoice_number: {
              type: 'string',
              description: 'Numéro de facture'
            },
            customer_id: {
              type: 'string',
              format: 'uuid'
            },
            amount: {
              type: 'number',
              format: 'decimal'
            },
            tax_amount: {
              type: 'number',
              format: 'decimal'
            },
            total_amount: {
              type: 'number',
              format: 'decimal'
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
              description: 'Statut de la facture'
            },
            due_date: {
              type: 'string',
              format: 'date'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string'
                  },
                  quantity: {
                    type: 'integer'
                  },
                  unit_price: {
                    type: 'number',
                    format: 'decimal'
                  },
                  total: {
                    type: 'number',
                    format: 'decimal'
                  }
                }
              }
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'Nom du produit'
            },
            description: {
              type: 'string',
              description: 'Description détaillée'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Prix unitaire'
            },
            category: {
              type: 'string',
              description: 'Catégorie'
            },
            sku: {
              type: 'string',
              description: 'SKU/Référence'
            },
            stock: {
              type: 'integer',
              description: 'Stock disponible'
            },
            image_url: {
              type: 'string',
              format: 'uri',
              description: 'URL de l\'image'
            }
          }
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string',
              description: 'Titre de la tâche'
            },
            description: {
              type: 'string',
              description: 'Description détaillée'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: 'Statut de la tâche'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Priorité'
            },
            assigned_to: {
              type: 'string',
              format: 'uuid',
              description: 'ID de l\'utilisateur assigné'
            },
            due_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date d\'échéance'
            },
            related_to: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['contact', 'deal', 'company', 'project']
                },
                id: {
                  type: 'string',
                  format: 'uuid'
                }
              }
            }
          }
        },
        Workflow: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'Nom du workflow'
            },
            description: {
              type: 'string'
            },
            trigger: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['manual', 'schedule', 'event', 'webhook']
                },
                config: {
                  type: 'object'
                }
              }
            },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['email', 'task', 'notification', 'webhook', 'update']
                  },
                  config: {
                    type: 'object'
                  }
                }
              }
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'draft'],
              description: 'Statut du workflow'
            }
          }
        }
      },
      parameters: {
        pageParam: {
          name: 'page',
          in: 'query',
          description: 'Numéro de page',
          schema: {
            type: 'integer',
            default: 1,
            minimum: 1
          }
        },
        limitParam: {
          name: 'limit',
          in: 'query',
          description: 'Nombre d\'éléments par page',
          schema: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 100
          }
        },
        searchParam: {
          name: 'search',
          in: 'query',
          description: 'Recherche textuelle',
          schema: {
            type: 'string'
          }
        },
        sortParam: {
          name: 'sort',
          in: 'query',
          description: 'Champ de tri',
          schema: {
            type: 'string',
            enum: ['created_at', 'updated_at', 'name', 'amount', 'date']
          }
        },
        orderParam: {
          name: 'order',
          in: 'query',
          description: 'Ordre de tri',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token d\'authentification manquant ou invalide',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Unauthorized - Please login'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Permissions insuffisantes',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Forbidden - Insufficient permissions'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Resource not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Erreur de validation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Validation error',
                details: {
                  field: 'email',
                  message: 'Invalid email format'
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: '🔐 Authentication',
        description: 'Gestion de l\'authentification et des sessions'
      },
      {
        name: '👥 CRM Core',
        description: 'Contacts, Companies, Deals, Leads'
      },
      {
        name: '📊 Analytics',
        description: 'Tableaux de bord et analyses'
      },
      {
        name: '💰 Finance',
        description: 'Factures, Paiements, Dépenses'
      },
      {
        name: '🤖 Automation',
        description: 'Workflows, AI, Webhooks'
      },
      {
        name: '📧 Communication',
        description: 'Emails, Notifications, Campagnes'
      },
      {
        name: '📁 Documents',
        description: 'Gestion documentaire'
      },
      {
        name: '⚙️ Configuration',
        description: 'Paramètres, Teams, Templates'
      },
      {
        name: '📦 Inventory',
        description: 'Produits, Fournisseurs, Stock'
      },
      {
        name: '✅ Tasks',
        description: 'Gestion des tâches et activités'
      }
    ],
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts'
  ]
};

export const setupSwagger = (app: Express) => {
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Custom CSS pour un thème moderne
  const customCss = `
    .swagger-ui .topbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNSAxNUwyNSAyNSIgc3Ryb2tlPSIjNjY3ZWVhIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMjUgMTVMMTUgMjUiIHN0cm9rZT0iIzc2NGJhMiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+'); }
    .swagger-ui .info .title { color: #667eea; }
    .swagger-ui .btn.authorize {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }
    .swagger-ui .btn.authorize:hover {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }
    .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #49cc90; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #61affe; }
    .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #fca130; }
    .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #f93e3e; }
    .swagger-ui .btn.execute {
      background: #667eea;
      border: none;
    }
    .swagger-ui .btn.execute:hover {
      background: #764ba2;
    }
    .swagger-ui select {
      padding: 8px;
      border-radius: 4px;
    }
    .swagger-ui .scheme-container {
      background: #f7f8fa;
      padding: 15px;
      border-radius: 8px;
    }
    .swagger-ui .models {
      margin-top: 30px;
      border-top: 2px solid #e1e4e8;
      padding-top: 30px;
    }
    .swagger-ui .model-container {
      background: #f7f8fa;
      border-radius: 8px;
      margin: 10px 0;
    }
    body {
      margin: 0;
      background: #fafbfc;
    }
    .swagger-ui .info {
      margin-bottom: 40px;
    }
    .swagger-ui .info .description {
      font-size: 16px;
      line-height: 1.6;
    }
    .swagger-ui .tag-section {
      margin: 40px 0;
    }
    .swagger-ui h3.opblock-tag {
      font-size: 24px;
      margin: 30px 0 20px 0;
    }
  `;

  const options: swaggerUi.SwaggerUiOptions = {
    customCss,
    customSiteTitle: 'Simplix CRM API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      displayOperationId: false,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    }
  };

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, options));

  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at http://localhost:3000/api-docs');
};

export default swaggerOptions;