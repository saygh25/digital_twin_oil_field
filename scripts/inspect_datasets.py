import json
import pandas as pd
import numpy as np

def inspect_baghewala_css():
    print("==================================================")
    print("1. DATASET: baghewala_css_dataset.csv")
    print("==================================================")
    df = pd.read_csv("data/raw/baghewala_css_dataset.csv")
    print(f"Shape: {df.shape}")
    print("\nColumns & Types:")
    for col in df.columns:
        null_count = df[col].isnull().sum()
        sample_val = df[col].dropna().iloc[0] if len(df[col].dropna()) > 0 else None
        print(f"  - {col} ({df[col].dtype}): {null_count} nulls, sample={sample_val}")
    print("\nSummary Statistics:")
    print(df.describe().T[["mean", "std", "min", "50%", "max"]].to_string())
    print("\nUnique wells count:", df["well_id"].nunique() if "well_id" in df else "N/A")
    if "well_id" in df:
        print("Wells:", df["well_id"].unique()[:10].tolist())
    if "css_cycle" in df:
        print("CSS Cycles distribution:", df["css_cycle"].value_counts().to_dict())

def inspect_rod_parquet(file_path, name):
    print("==================================================")
    print(f"2. DATASET: {name} ({file_path})")
    print("==================================================")
    df = pd.read_parquet(file_path)
    print(f"Shape: {df.shape}")
    print("Columns:", df.columns.tolist())
    for col in df.columns:
        print(f"  - {col}: {df[col].dtype}, nulls={df[col].isnull().sum()}")
    print("\nSample records (first 3):")
    print(df.head(3))
    if "parameter" in df.columns:
        print("\nUnique parameters & counts:")
        print(df["parameter"].value_counts())
        print("\nParameter statistics (value per parameter):")
        for p, grp in df.groupby("parameter")["value"]:
            print(f"  * {p}: count={len(grp)}, min={grp.min():.2f}, mean={grp.mean():.2f}, max={grp.max():.2f}")
    if "well_id" in df.columns:
        print("\nUnique wells:", df["well_id"].unique().tolist())
    if "timestamp" in df.columns:
        print(f"Timestamp range: {df['timestamp'].min()} to {df['timestamp'].max()}")

def inspect_volve():
    print("==================================================")
    print("3. DATASET: Volve production data.xlsx")
    print("==================================================")
    xl = pd.ExcelFile("data/raw/Volve production data.xlsx")
    print("Sheets in Volve file:", xl.sheet_names)
    for sheet in xl.sheet_names:
        df = xl.parse(sheet, nrows=5)
        print(f"\n--- Sheet: {sheet} (Preview columns) ---")
        print(df.columns.tolist())
        full_df = xl.parse(sheet)
        print(f"Full Sheet Shape: {full_df.shape}")
        numeric_cols = full_df.select_dtypes(include=[np.number]).columns.tolist()
        print(f"Numeric columns sample: {numeric_cols[:10]}")

if __name__ == "__main__":
    inspect_baghewala_css()
    inspect_rod_parquet("data/raw/train_rod.parquet", "train_rod.parquet")
    inspect_rod_parquet("data/raw/test_rod.parquet", "test_rod.parquet")
    inspect_volve()
