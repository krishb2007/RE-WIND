# Name (ID) : Anidhya Jyoti (30326595) and Kishore Ramachandraprabu (30329678)
# Tutorial : 13
# Anidhya Jyoti did about 50%. Kishore Ramachandraprabu did about 50%.
# Assignment 02

from SimpleGraphics import*

#Deciding pie-chart or bar-chart
print("Chart Creation Menu" "\n" "\t" "1. Pie Chart" "\n" "\t" "2. Bar Chart")
type = int(input("Select your chart type >> "))

list_colors = ["dark orchid","green3","blue3","orange","turquoise3","red4"]          #Creating a list of colors

#Creating the pie-chart
if(type == 1):

    #Taking input for the title and creating it centered on top of the chart
    pie_title = input("Enter the title of the chart : ")
    setColor("black")
    setFont("Montserrat",30,"Bold")
    text((getWidth()//2),50,pie_title)

    #taking input for the number of sectors and it's total value
    num_of_sectors = int(input("Enter the number of sectors (2 to 6) : "))
    total_value = int(input("Enter the total value of all sectors : "))
    
    #Intializing variables related to the pie-chart layout
    pie_x_coords = 175
    pie_y_coords = 100
    diameter = 450
    legend_side = 50
    top_space = 75

    intial_angle = 0          #The first slice starts at 0 degrees

    #Calculating the space between each legend so it is symmetric
    legend_space = (600-(2*top_space)-(num_of_sectors*legend_side))/(num_of_sectors-1)

    #Font style for the label
    setFont("Arial",10,"Bold")
    setWidth(2)
    setOutline("black")

    #for loop to get and calculate data
    for i in range(0,num_of_sectors,1):
        label_sector = input("Label sector " + str(i+1) + " : ")

        #Deciding the x & y coordinates of the legend box and the label 
        legend_y = top_space + (i*legend_side) + (i*legend_space)
        legend_x = (pie_x_coords+diameter+100)

        #Creating the legend and it's label
        setFill(list_colors[i])
        text((legend_x+(legend_side//2)),legend_y-10,label_sector)
        rect(legend_x,legend_y,legend_side,legend_side)

        #Taking inputs for the pie-slice/sectors (doesn't ask vaue for last sector)
        if(i < num_of_sectors-1):
            sector_value = int(input("Enter the value of the " + label_sector + " sector : "))
            angle_extent = (sector_value/total_value)*360
        else:
            angle_extent = 360 - intial_angle

        #Creating the sectors and changing the intial angle value for the next sector
        pieSlice(pie_x_coords,pie_y_coords,diameter,diameter,intial_angle,angle_extent)
        intial_angle += angle_extent

    #Pie chart completed
    print("Your chart is completed.")

#Creating the bar-chart
elif(type == 2):

    #Intializing variables related to the bar-chart layout & the bars
    bar_x_coords = 100
    bar_y_coords = 100
    x_axis_length = 600
    y_axis_length = 400
    
    bar_width = [172,120,92,74,62]          #Different bar width depending on number of bars
    bar_space = [86,60,46,37,31]          #Different bar space depending on number of bars

    #Taking input for the title, number of bars, gridline interval & y-axis label
    bar_title = input("Enter the title of the chart : ")
    num_of_bars = int(input("Enter the number of bars (2 to 6) : "))
    grid_interval = int(input("Enter the gridline interval (10 to 100) : "))
    y_axis_label = input("Enter the label for the Y-Axis : ")

    #Creating the title, label on the y-axis & bar-chart layout
    setColor("black")
    setFont("Montserrat",30,"Bold")
    text((getWidth()//2),(bar_y_coords)//2,bar_title)

    setFont("Arial",12,"Bold")
    text((bar_x_coords)//2,((bar_y_coords)*2+y_axis_length)//2,y_axis_label)

    setColor("white")
    setOutline("black")
    setWidth(2)
    rect(bar_x_coords,bar_y_coords,x_axis_length,y_axis_length)

    #Creating the gridlines and displaying it's values on the right side
    for i in range(0,y_axis_length+1,grid_interval):
        setWidth(1)
        line(bar_x_coords,(bar_y_coords+y_axis_length)-i,(bar_x_coords+x_axis_length),(bar_y_coords+y_axis_length)-i)
        setFont("Roboto",7)
        text((bar_x_coords+x_axis_length)+15,(bar_y_coords+y_axis_length)-i,i)

    #for loop to get and calculate data
    for i in range(1,num_of_bars+1,1):
        label_bar = input("Label bar " + str(i) + " : ")
        bar_value = int(input("Enter the value of bar " + label_bar + " : "))

        #Creating the bars
        setColor(list_colors[i-1])
        setWidth(1)
        rect((bar_x_coords+(bar_space[num_of_bars-2])*i+(bar_width[num_of_bars-2])*(i-1)),(bar_y_coords+y_axis_length-bar_value),bar_width[num_of_bars-2],bar_value-2)

        #Displaying the labels/bar names below the bars
        setColor("black")
        setFont("Lato",12)
        text((bar_x_coords+(bar_space[num_of_bars-2])*i+(bar_width[num_of_bars-2])*(i-1)+(bar_width[num_of_bars-2])//2),(bar_y_coords+y_axis_length+20),label_bar)

        #Displaying the bar value near the top of the bar
        setFont("Lato",15,"Bold")
        text((bar_x_coords+(bar_space[num_of_bars-2])*i+(bar_width[num_of_bars-2])*(i-1)+(bar_width[num_of_bars-2])//2),(bar_y_coords+y_axis_length+15-bar_value),bar_value)
        
    #Bar chart completed
    print("Your chart is completed.")

#Checking input validation
else:
    print("Invalid input :(")