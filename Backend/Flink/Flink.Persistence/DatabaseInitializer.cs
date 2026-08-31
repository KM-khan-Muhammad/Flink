using System.Data;
using Dapper;
using Flink.Application.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Flink.Persistence
{
    public static class DatabaseInitializer
    {
        public static void Initialize(IServiceProvider serviceProvider)
        {
            try
            {
                var config = serviceProvider.GetRequiredService<IConfiguration>();
                var connectionString = config.GetConnectionString("DefaultConnection");
                
                // Extract the database name from connection string
                var builder = new SqlConnectionStringBuilder(connectionString);
                var databaseName = builder.InitialCatalog;
                
                // Connect to master to create DB if not exists
                builder.InitialCatalog = "master";
                using (var masterConnection = new SqlConnection(builder.ConnectionString))
                {
                    masterConnection.Open();
                    var dbCount = masterConnection.ExecuteScalar<int>($"SELECT COUNT(*) FROM sys.databases WHERE name = @name", new { name = databaseName });
                    if (dbCount == 0)
                    {
                        masterConnection.Execute($"CREATE DATABASE [{databaseName}]");
                    }
                }

                // Connect to actual database to create tables
                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    
                    var createUsersTableSql = @"
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                    BEGIN
                        CREATE TABLE Users (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            FirstName NVARCHAR(100) NULL,
                            LastName NVARCHAR(100) NULL,
                            DateOfBirth DATETIME2 NULL,
                            WhatsAppNumber NVARCHAR(50) NULL,
                            IsWhatsAppVerified BIT NOT NULL DEFAULT 0,
                            Username NVARCHAR(100) NOT NULL UNIQUE,
                            Email NVARCHAR(255) NOT NULL UNIQUE,
                            PasswordHash NVARCHAR(MAX) NOT NULL,
                            IsEmailVerified BIT NOT NULL DEFAULT 0,
                            VerificationToken NVARCHAR(MAX) NULL,
                            VerificationTokenExpires DATETIME2 NULL,
                            PasswordResetToken NVARCHAR(MAX) NULL,
                            PasswordResetTokenExpires DATETIME2 NULL,
                            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                            LastActiveAt DATETIME2 NULL
                        )
                    END
                    ELSE
                    BEGIN
                        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'FirstName' AND Object_ID = Object_ID(N'Users'))
                        BEGIN
                            ALTER TABLE Users ADD FirstName NVARCHAR(100) NULL;
                            ALTER TABLE Users ADD LastName NVARCHAR(100) NULL;
                            ALTER TABLE Users ADD DateOfBirth DATETIME2 NULL;
                            ALTER TABLE Users ADD WhatsAppNumber NVARCHAR(50) NULL;
                            ALTER TABLE Users ADD IsWhatsAppVerified BIT NOT NULL DEFAULT 0;
                        END
                        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'LastActiveAt' AND Object_ID = Object_ID(N'Users'))
                        BEGIN
                            ALTER TABLE Users ADD LastActiveAt DATETIME2 NULL;
                        END
                    END";

                    connection.Execute(createUsersTableSql);

                    var createChatsTablesSql = @"
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Chats' and xtype='U')
                    BEGIN
                        CREATE TABLE Chats (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            Name NVARCHAR(200) NULL,
                            IsGroup BIT NOT NULL DEFAULT 0,
                            CreatedByUserId INT NOT NULL,
                            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                        )
                    END

                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChatMembers' and xtype='U')
                    BEGIN
                        CREATE TABLE ChatMembers (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            ChatId INT NOT NULL,
                            UserId INT NOT NULL,
                            JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                            FOREIGN KEY (ChatId) REFERENCES Chats(Id),
                            FOREIGN KEY (UserId) REFERENCES Users(Id)
                        )
                    END

                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Messages' and xtype='U')
                    BEGIN
                        CREATE TABLE Messages (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            ChatId INT NOT NULL,
                            SenderId INT NOT NULL,
                            Content NVARCHAR(MAX) NOT NULL,
                            MessageType NVARCHAR(50) NOT NULL DEFAULT 'text',
                            IsRead BIT NOT NULL DEFAULT 0,
                            IsDeleted BIT NOT NULL DEFAULT 0,
                            ReplyToMessageId INT NULL,
                            SentAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                            EditedAt DATETIME2 NULL,
                            FOREIGN KEY (ChatId) REFERENCES Chats(Id),
                            FOREIGN KEY (SenderId) REFERENCES Users(Id),
                            FOREIGN KEY (ReplyToMessageId) REFERENCES Messages(Id)
                        )
                    END
                    ELSE
                    BEGIN
                        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'IsDeleted' AND Object_ID = Object_ID(N'Messages'))
                        BEGIN
                            ALTER TABLE Messages ADD IsDeleted BIT NOT NULL DEFAULT 0;
                        END
                        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'ReplyToMessageId' AND Object_ID = Object_ID(N'Messages'))
                        BEGIN
                            ALTER TABLE Messages ADD ReplyToMessageId INT NULL;
                        END
                        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'EditedAt' AND Object_ID = Object_ID(N'Messages'))
                        BEGIN
                            ALTER TABLE Messages ADD EditedAt DATETIME2 NULL;
                        END
                    END";

                    connection.Execute(createChatsTablesSql);

                    var createTypingStatusTableSql = @"
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TypingStatus' and xtype='U')
                    BEGIN
                        CREATE TABLE TypingStatus (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            ChatId INT NOT NULL,
                            UserId INT NOT NULL,
                            LastTypedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                            FOREIGN KEY (ChatId) REFERENCES Chats(Id),
                            FOREIGN KEY (UserId) REFERENCES Users(Id)
                        )
                    END";
                    connection.Execute(createTypingStatusTableSql);

                    var createCallsTableSql = @"
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Calls' and xtype='U')
                    BEGIN
                        CREATE TABLE Calls (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            ChatId INT NOT NULL,
                            CallerId INT NOT NULL,
                            ReceiverId INT NOT NULL,
                            CallType NVARCHAR(10) NOT NULL DEFAULT 'voice',
                            Status NVARCHAR(20) NOT NULL DEFAULT 'ringing',
                            StartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                            AnsweredAt DATETIME2 NULL,
                            EndedAt DATETIME2 NULL,
                            FOREIGN KEY (ChatId) REFERENCES Chats(Id),
                            FOREIGN KEY (CallerId) REFERENCES Users(Id),
                            FOREIGN KEY (ReceiverId) REFERENCES Users(Id)
                        )
                    END";
                    connection.Execute(createCallsTableSql);

                    var createStatusesTableSql = @"
                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Statuses' and xtype='U')
                    BEGIN
                        CREATE TABLE Statuses (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            UserId INT NOT NULL,
                            Text NVARCHAR(MAX) NULL,
                            ImageUrl NVARCHAR(MAX) NULL,
                            CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                            ExpiresAt DATETIME2 NOT NULL,
                            FOREIGN KEY (UserId) REFERENCES Users(Id)
                        )
                    END";
                    connection.Execute(createStatusesTableSql);
                }
            }
            catch (SqlException ex)
            {
                Console.WriteLine($"[DatabaseInitializer] SQL Error: {ex.Message}");
                Console.WriteLine("[DatabaseInitializer] Make sure SQL Server is running and the connection string is correct.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DatabaseInitializer] Error: {ex.Message}");
            }
        }
    }
}
