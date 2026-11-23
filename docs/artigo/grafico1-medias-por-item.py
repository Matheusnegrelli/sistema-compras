import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
plt.rcParams['font.family']='Liberation Sans'
items=['UP1','UP2','UP3','UP4','UP5','UP6','UP7','UP8','FUP1','FUP2','FUP3','FUP4','FUP5','FUP6','AT1','AT2','AT3','IU1','IU2','IU3']
vals=[4.43,4.57,4.71,5,4.86,5,4.71,4.86,4.71,4.71,4.86,5,4.86,5,5,5,5,5,5,5]
groups=[('Utilidade percebida (UP)',0,7),('Facilidade de uso percebida (FUP)',8,13),('Atitude (AT)',14,16),('Intenção de uso (IU)',17,19)]
x=[]; pos=0
for i,it in enumerate(items):
    if i in (8,14,17): pos+=0.8
    x.append(pos); pos+=1
fig,ax=plt.subplots(figsize=(7.2,3.1),dpi=300)
col='#1f6f66'
ax.bar(x,[v-1 for v in vals],bottom=1,width=0.68,color=col,zorder=3)
for xi,v in zip(x,vals):
    ax.text(xi,v+0.05,f'{v:.2f}'.replace('.',','),ha='center',va='bottom',fontsize=6.3,color='#222')
ax.set_ylim(1,5.4); ax.set_yticks([1,2,3,4,5]); ax.set_yticklabels(['1,0','2,0','3,0','4,0','5,0'],fontsize=7)
ax.set_xticks(x); ax.set_xticklabels(items,fontsize=6.6,rotation=0)
ax.set_xlim(x[0]-0.7,x[-1]+0.7)
ax.set_ylabel('Média (escala de 1 a 5)',fontsize=7)
ax.grid(axis='y',color='#dddddd',lw=0.6,zorder=0)
for s in ['top','right']: ax.spines[s].set_visible(False)
for s in ['left','bottom']: ax.spines[s].set_color('#888')
ax.tick_params(colors='#444',length=2)
for name,a,b in groups:
    xa,xb=x[a]-0.4,x[b]+0.4
    ax.annotate('',xy=(xa,-0.17),xytext=(xb,-0.17),xycoords=('data','axes fraction'),textcoords=('data','axes fraction'),arrowprops=dict(arrowstyle='-',color='#888',lw=0.6))
    ax.text((xa+xb)/2,-0.21,name,transform=ax.get_xaxis_transform(),ha='center',va='top',fontsize=6.6,color='#333')
plt.tight_layout()
fig.savefig('grafico1-itens.png',dpi=300,bbox_inches='tight',facecolor='white')
