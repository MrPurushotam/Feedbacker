const { Client } = require('pg');
require('dotenv').config();

class Database {
    constructor(connectionString) {
        if (Database.instance) {
            return Database.instance;
        }
        this.client = null;
        this.isConnecting = false;
        this.connectionString = connectionString || process.env.DB_CONNECTION_STRING;
        if (this.connectionString === undefined) {
            throw new Error("No connection string provided.");
        }
        Database.instance = this;
    }
    get clientInstance() {
        return this.client;
    }
    async Connect() {
        if (!this.connectionString) {
            throw new Error("No connection string provided");
        }
        if (this.isConnecting) {
            return this.client;
        }

        if (!this.client) {
            this.isConnecting = true;

            try {
                this.client = new Client({
                    connectionString: this.connectionString
                });

                this.client.on('error', (err) => {
                    console.error('Database connection error:', err);
                    this.client = null;
                    this.isConnecting = false;
                });

                this.client.on('end', () => {
                    console.log('Database connection ended');
                    this.client = null;
                    this.isConnecting = false;
                });

                await this.client.connect();
                console.log("Database connected successfully");
                this.isConnecting = false;
                return true;
            } catch (error) {
                console.log("Error connecting to the database:", error);
                this.client = null;
                this.isConnecting = false;
                return false;
            }
        }
        return this.client;
    }

    async disconnect() {
        if (this.client) {
            try {
                await this.client.end();
                console.log("Database connection closed successfully");
                this.client = null;
            } catch (error) {
                console.error("Error closing database connection:", error);
            }
        }
    }

    isConnected() {
        return this.client && !this.client._ending;
    }

    async CreateTable() {
        if (!this.client) {
            await this.Connect();
        }
        const query = `
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100),
                email VARCHAR(250) UNIQUE NOT NULL,
                password VARCHAR(250) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS forms (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                closed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_public BOOLEAN DEFAULT FALSE
            );
            
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
                    CREATE TYPE question_type_enum AS ENUM ('text', 'email', 'number', 'date', 'checkbox', 'radio', 'url');
                END IF;
            END $$;

            CREATE TABLE IF NOT EXISTS questions(
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                question_type question_type_enum NOT NULL DEFAULT 'text',
                is_required BOOLEAN DEFAULT FALSE,
                order_index INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS options(
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
                option_text TEXT NOT NULL,
                order_index INT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS responses(
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS answers(
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
                question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
                answer_text TEXT,
                option_id UUID REFERENCES options(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
            CREATE INDEX IF NOT EXISTS idx_questions_form_id ON questions(form_id);
            CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);
            CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
            CREATE INDEX IF NOT EXISTS idx_answers_response_id ON answers(response_id);
            CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

        `;
        return this.client.query(query)
            .then(res => {
                console.log("Table created successfully");
                return res;
            })
            .catch(err => {
                console.error("Error creating table:", err);
                throw err;
            });
    }

    async Client() {
        if (!this.client) {
            await this.Connect();
        }
        return this.client;
    }
}

const db = new Database();

process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connection...');
    await db.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connection...');
    await db.disconnect();
    process.exit(0);
});

process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    await db.disconnect();
    process.exit(1);
});


module.exports = db;