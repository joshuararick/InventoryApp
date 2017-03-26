package com.Rarick.inventoryapp;

import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import com.Rarick.inventoryapp.R;

import java.util.ArrayList;


public class ListViewAdapter extends BaseAdapter {

    private static final String TAG = ListViewAdapter.class.getSimpleName();
    ArrayList<Inventory> listArray;

    public ListViewAdapter(ArrayList<Inventory> listArray) {
        this.listArray = new ArrayList<Inventory>(listArray);
    }

    @Override
    public int getCount() {
        return listArray.size();    // total number of elements in the list
    }

    @Override
    public Object getItem(int i) {
        return listArray.get(i);    // single item in the list
    }

    @Override
    public long getItemId(int i) {
        return i;                   // index number
    }

    @Override
    public View getView(int index, View view, final ViewGroup parent) {

        if (view == null) {
            LayoutInflater inflater = LayoutInflater.from(parent.getContext());
            view = inflater.inflate(R.layout.item_list_view, parent, false);
        }


        final Inventory dataModel = listArray.get(index);


        final TextView productName = (TextView) view.findViewById(R.id.productName);
        productName.setText(dataModel.getProductName());

        final TextView productAvailable = (TextView) view.findViewById(R.id.productAvailable);
        productAvailable.setText("" + dataModel.getQuantity());

        final TextView productPrice = (TextView) view.findViewById(R.id.productPrice);
        productPrice.setText("$" + dataModel.getPrice());

        Button button = (Button) view.findViewById(R.id.listItemButton);


        this.notifyDataSetChanged();



        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                DBHandler db = new DBHandler(view.getContext());
                dataModel.quantitySale();
                if (dataModel.getQuantity() == 0) {
                    Toast.makeText(parent.getContext(), "No more item(s) of " + dataModel.getProductName() + " left out.\n Order Now !!! ", Toast.LENGTH_SHORT).show();
                }
                db.updateHabitRow(dataModel.getProductId(), dataModel);
                productAvailable.setText("" + dataModel.getQuantity());
                Toast.makeText(parent.getContext(), "Quantity for  " + dataModel.getProductName() + " is reduced by 1.\nAvailable Quantity: " + dataModel.getQuantity(), Toast.LENGTH_SHORT).show();
            }
        });


        view.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                Intent details = new Intent(parent.getContext(), ItemFullDisplayActivity.class);
                details.putExtra("productName", dataModel.getProductName());
                details.putExtra("productQuantity", dataModel.getQuantity());
                details.putExtra("id", dataModel.getProductId());
                parent.getContext().startActivity(details);

            }
        });

        return view;
    }
}