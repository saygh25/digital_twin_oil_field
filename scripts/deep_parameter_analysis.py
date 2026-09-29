import pandas as pd
import numpy as np

print("="*60)
print("PARAMETER COMPARISON ACROSS ALL 4 DATASETS")
print("="*60)

# 1. Baghewala CSS Dataset
df_css = pd.read_csv("data/raw/baghewala_css_dataset.csv")
print("\n[1] baghewala_css_dataset.csv (10,000 cycles, 20 wells)")
print("Columns:", len(df_css.columns))
for c in df_css.columns:
    print(f"  {c:<35} | {str(df_css[c].dtype):<8} | min: {df_css[c].min() if np.issubdtype(df_css[c].dtype, np.number) else 'N/A'} | max: {df_css[c].max() if np.issubdtype(df_css[c].dtype, np.number) else 'N/A'}")

# 2. train_rod.parquet
df_train = pd.read_parquet("data/raw/train_rod.parquet")
print("\n[2] train_rod.parquet (37,943 telemetry rows, 10 wells)")
for p in df_train["parameter"].unique():
    subset = df_train[df_train["parameter"] == p]
    unit = subset["unit"].iloc[0] if "unit" in subset else ""
    print(f"  {p:<25} | Unit: {unit:<15} | Min: {subset['value'].min():<10.2f} | Mean: {subset['value'].mean():<10.2f} | Max: {subset['value'].max():<10.2f}")

# 3. test_rod.parquet
df_test = pd.read_parquet("data/raw/test_rod.parquet")
print("\n[3] test_rod.parquet (148,308 telemetry rows, 10 wells)")
for p in df_test["parameter"].unique():
    subset = df_test[df_test["parameter"] == p]
    unit = subset["unit"].iloc[0] if "unit" in subset else ""
    print(f"  {p:<25} | Unit: {unit:<15} | Min: {subset['value'].min():<10.2f} | Mean: {subset['value'].mean():<10.2f} | Max: {subset['value'].max():<10.2f}")

# 4. Volve production data.xlsx
xl = pd.ExcelFile("data/raw/Volve production data.xlsx")
df_volve_daily = xl.parse("Daily Production Data")
print("\n[4] Volve production data.xlsx (Daily Production Data, 15,634 rows)")
for c in df_volve_daily.columns:
    if np.issubdtype(df_volve_daily[c].dtype, np.number):
        print(f"  {c:<25} | Min: {df_volve_daily[c].min():<10.2f} | Mean: {df_volve_daily[c].mean():<10.2f} | Max: {df_volve_daily[c].max():<10.2f}")
    else:
        print(f"  {c:<25} | Non-numeric / Categorical ({df_volve_daily[c].nunique()} unique)")
