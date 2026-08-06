import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { investmentApi, liabilityApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Building2, Shield, Landmark } from "lucide-react";

export default function WealthPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWealthData() {
      try {
        const [portfolioData, loansData, insuranceData] = await Promise.all([
          investmentApi.getPortfolio(),
          liabilityApi.getLoans(),
          liabilityApi.getInsurance()
        ]);
        setPortfolio(portfolioData.data);
        setLoans(loansData.data);
        setInsurance(insuranceData.data);
      } catch (error) {
        console.error("Failed to load wealth data", error);
      } finally {
        setLoading(false);
      }
    }
    loadWealthData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalInvestments = portfolio?.currentValue || 0;
  const totalDebt = loans.reduce((sum, loan) => sum + Number(loan.balanceAmount), 0);
  const netWorth = totalInvestments - totalDebt;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Wealth Command Center</h2>
          <p className="text-muted-foreground mt-1">
            Manage your investments, liabilities, and insurance all in one place.
          </p>
        </div>
      </div>

      {/* Net Worth Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Total Assets - Total Debt</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-t-4 border-t-green-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Investments</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalInvestments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Current Portfolio Value</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-t-4 border-t-red-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Liabilities</CardTitle>
              <Building2 className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Total Outstanding Debt</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="inline-flex flex-wrap h-auto justify-start">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="portfolio" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Investment Portfolio</CardTitle>
              <CardDescription>View your stocks, ETFs, crypto, and other assets.</CardDescription>
            </CardHeader>
            <CardContent>
              {portfolio?.investments?.length > 0 ? (
                <div className="space-y-4">
                  {portfolio.investments.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{inv.name}</p>
                          <p className="text-sm text-muted-foreground">{inv.symbol || inv.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(Number(inv.currentPrice || inv.investedAmount) * Number(inv.quantity || 1)).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Qty: {inv.quantity || 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No investments found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="liabilities" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Loans & Debt</CardTitle>
              <CardDescription>Manage your mortgages, auto loans, and personal debt.</CardDescription>
            </CardHeader>
            <CardContent>
              {loans?.length > 0 ? (
                <div className="space-y-4">
                  {loans.map((loan: any) => (
                    <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-500/10 rounded-full">
                          <Building2 className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium">{loan.name}</p>
                          <p className="text-sm text-muted-foreground">{loan.provider} - {Number(loan.interestRate)}% APR</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500">${Number(loan.balanceAmount).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">EMI: ${Number(loan.emiAmount).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No active liabilities found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Policies</CardTitle>
              <CardDescription>Track your life, health, and property insurance coverages.</CardDescription>
            </CardHeader>
            <CardContent>
              {insurance?.length > 0 ? (
                <div className="space-y-4">
                  {insurance.map((policy: any) => (
                    <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-full">
                          <Shield className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">{policy.name}</p>
                          <p className="text-sm text-muted-foreground">{policy.provider} ({policy.type})</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${Number(policy.coverageAmount).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Coverage</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No insurance policies found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
