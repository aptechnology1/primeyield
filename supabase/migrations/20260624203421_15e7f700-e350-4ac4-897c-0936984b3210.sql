alter table public.settings
  add column if not exists deposit_instructions text not null default
'Lowest deposit shown above.
Automated: pay with card or bank transfer — money is added to your wallet at once.
Bank transfer: send the exact amount to the bank account shown, then fill the form with your sender name or transfer reference. Most transfers are approved within 5 to 30 minutes during work hours.
Always use the correct reference. Wrong amount or transfers we cannot find may be rejected.
You must make at least one deposit before you can invest or withdraw.',
  add column if not exists withdraw_instructions text not null default
'Lowest and highest withdrawal are shown above.
A small fee is taken from each withdrawal — you will see it before you confirm.
You must have at least one deposit and one investment plan before you can withdraw.
Welcome bonus and locked money cannot be withdrawn.
We pay out by hand, normally inside 24 hours on work days.
Make sure your bank details are correct — wrong details can delay or stop your payout.',
  add column if not exists referral_instructions text not null default
'Share your link with friends. When they sign up with it, they join your team.
You earn on 3 levels: people you invite (L1), people they invite (L2) and the next level (L3).
The percentage and what it is paid on (deposit, investment or daily earnings) is set by the admin.
Your earnings go straight into your wallet and can be withdrawn once you meet the withdrawal rules.';