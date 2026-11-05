-- =================================================================
-- Database Schema for Handloom AI Design Suggestion Tool
-- Target System: SQL Server Management Studio (SSMS) / MS SQL Server
-- Project: College CSP Prototype - Chenetha Design Mitra (చేనేత డిజైన్ మిత్ర)
-- =================================================================

USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HandloomDesignDB')
BEGIN
    CREATE DATABASE HandloomDesignDB;
END
GO

USE HandloomDesignDB;
GO

-- 1. Weavers / Users Table
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
CREATE TABLE dbo.Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Location NVARCHAR(100) DEFAULT N'Andhra Pradesh',
    LanguagePreference NVARCHAR(10) DEFAULT N'te-IN',
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 2. Motifs Master Catalog Table
IF OBJECT_ID('dbo.Motifs', 'U') IS NOT NULL DROP TABLE dbo.Motifs;
CREATE TABLE dbo.Motifs (
    MotifID INT IDENTITY(1,1) PRIMARY KEY,
    MotifNameEn NVARCHAR(100) NOT NULL,
    MotifNameTe NVARCHAR(100) NOT NULL,
    Category NVARCHAR(50) NOT NULL, -- Traditional, Floral, Fauna, Geometric, Temple
    Symbolism NVARCHAR(255) NULL,
    SVGData NVARCHAR(MAX) NULL
);
GO

-- 3. Saved Designs Table
IF OBJECT_ID('dbo.Designs', 'U') IS NOT NULL DROP TABLE dbo.Designs;
CREATE TABLE dbo.Designs (
    DesignID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL FOREIGN KEY REFERENCES dbo.Users(UserID),
    DesignTitle NVARCHAR(150) NOT NULL,
    SareeStyle NVARCHAR(100) NOT NULL, -- Uppada, Mangalagiri, Pochampally, Venkatagiri, Kanchipuram, Dharmavaram
    FabricType NVARCHAR(50) DEFAULT N'Silk', -- Silk, Cotton, Tussar, Organza
    BodyColor NVARCHAR(30) NOT NULL,
    BorderColor NVARCHAR(30) NOT NULL,
    PalluColor NVARCHAR(30) NOT NULL,
    ZariColor NVARCHAR(30) DEFAULT N'#D97706',
    MotifType NVARCHAR(50) NOT NULL,
    MotifDensity NVARCHAR(30) DEFAULT N'Medium',
    BorderStyle NVARCHAR(50) NOT NULL,
    PromptUsed NVARCHAR(MAX) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 4. Color Palettes Table
IF OBJECT_ID('dbo.ColorPalettes', 'U') IS NOT NULL DROP TABLE dbo.ColorPalettes;
CREATE TABLE dbo.ColorPalettes (
    PaletteID INT IDENTITY(1,1) PRIMARY KEY,
    PaletteNameEn NVARCHAR(100) NOT NULL,
    PaletteNameTe NVARCHAR(100) NOT NULL,
    PrimaryColor NVARCHAR(30) NOT NULL,
    SecondaryColor NVARCHAR(30) NOT NULL,
    AccentColor NVARCHAR(30) NOT NULL,
    ZariTone NVARCHAR(30) NOT NULL,
    Occasion NVARCHAR(50) NULL
);
GO

-- Seed Initial Data for Motifs
INSERT INTO dbo.Motifs (MotifNameEn, MotifNameTe, Category, Symbolism) VALUES
(N'Peacock (Mayuri)', N'నెమలి (మయూరి)', N'Fauna', N'Royalty, Beauty, Grace'),
(N'Mango / Paisley (Kalka)', N'మామిడి పిందే (కల్కా)', N'Traditional', N'Fertility, Prosperity, New Life'),
(N'Temple Gopuram', N'దేవాలయ గోపురం', N'Temple', N'Spiritual Elevation, Protection'),
(N'Elephant (Gaja)', N'ఏనుగు (గజ)', N'Fauna', N'Strength, Royalty, Wisdom'),
(N'Lotus (Kamala)', N'తామర పూవు (కమల)', N'Floral', N'Purity, Enlightenment, Good Fortune'),
(N'Chakra / Sun', N'చక్రం / సూర్యుడు', N'Geometric', N'Eternity, Cosmic Energy'),
(N'Swan (Hamsa)', N'హంస', N'Fauna', N'Purity, Discernment, Harmony'),
(N'Geometric Ikat Diamond', N'ఇకత్ డైమండ్', N'Geometric', N'Traditional Precision, Heritage');
GO

-- Seed Initial Data for Color Palettes
INSERT INTO dbo.ColorPalettes (PaletteNameEn, PaletteNameTe, PrimaryColor, SecondaryColor, AccentColor, ZariTone, Occasion) VALUES
(N'Royal Crimson & Gold', N'రాయల్ కెంపు & బంగారు వర్ణం', N'#800020', N'#D97706', N'#FBBF24', N'Antique Gold', N'Bridal / Wedding'),
(N'Peacock Teal & Magenta', N'నెమలి పింఛం పచ్చ & రాణి గులాబీ', N'#0F766E', N'#BE185D', N'#F59E0B', N'Bright Gold', N'Festive'),
(N'Temple Green & Vermilion', N'పచ్చ & కుంకుమ ఎరుపు', N'#064E3B', N'#B91C1C', N'#F59E0B', N'Rich Gold', N'Traditional Ceremony'),
(N'Pitambaram Yellow & Royal Purple', N'పీతాంబరం పసుపు & వంగపువ్వు రంగు', N'#EAB308', N'#5B21B6', N'#991B1B', N'Copper Zari', N'Pooja / Traditional'),
(N'Midnight Indigo & Silver', N'ఇండిగో నీలం & వెండి మైకం', N'#1E1B4B', N'#4338CA', N'#E2E8F0', N'Silver Zari', N'Modern Classic');
GO

SELECT * FROM dbo.Motifs;
SELECT * FROM dbo.ColorPalettes;
GO
