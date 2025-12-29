-- Initialize database and user
ALTER USER postgres WITH PASSWORD 'postgres123';
GRANT ALL PRIVILEGES ON DATABASE task_management TO postgres;
